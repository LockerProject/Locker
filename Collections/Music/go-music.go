package main

import (
	"fmt"
	"http"
	"io"
	"json"
	"log"
	"net"
	"os"
	"path"
	"strconv"
	"strings"
	"time"
	"url"
	"launchpad.net/gobson/bson"
	"launchpad.net/mgo"
)

const (
	lockerDbName        = "locker"
	trackCollectionName = "amusic_track"
	playCollectionName  = "amusic_play"
)

var (
	types        = [...]string{"track", "play"}
	trackSources = [...]string{"track/lastfm", "track/rdio"}
)

type MongoInfo struct {
	Host        string   `json:"host,omitempty"`
	Port        int      `json:"port,omitempty"`
	Collections []string `json:"collections,omitempty"`
}

type ProcessInfo struct {
	Port             int64     `json:"port"`
	SourceDirectory  string    `json:"sourceDirectory,omitempty"`
	WorkingDirectory string    `json:"workingDirectory,omitempty"`
	LockerUrl        string    `json:"lockerUrl,omitempty"`
	ExternalBase     string    `json:"externalBase,omitempty"`
	Mongo            MongoInfo `json:"mongoInfo,omitempty"`
}

type CollectionState struct {
	Readiness int    `json:"ready"`
	Count     int    `json:"count"`
	Updated   int64  `json:"updated"`
	LastId    string `json:"lastId"`
}

type MusicbrainzId string

type lastfmArtist struct {
	Name string        `json:"name"`
	MBID MusicbrainzId `json:"mbid"`
	URL  string        `json:"url"`
}

type lastfmTrack struct {
	Id        string        `json:"id"`
	MongoId   string        `json:"_id"`
	Name      string        `json:"name"`
	Duration  string        `json:"duration"`
	Playcount string        `json:"playcount"`
	MBID      MusicbrainzId `json:"mbid"`
	URL       string        `json:"url"`
	Artist    lastfmArtist  `json:"artist"`
}

type CandidateId struct {
	Type string `bson:"type"`
	Id   string `bson:"id"`
}

type Track struct {
	IdBundle []CandidateId `bson:"ids"`
	Name     string        `bson:"name"`
	Artist   string        `bson:"artist"`
	Duration int64         `bson:"duration"`
}

func loadConfig() *ProcessInfo {
	config := new(ProcessInfo)
	json.NewDecoder(os.Stdin).Decode(&config)

	return config
}

func mongoSession(pi *ProcessInfo) *mgo.Session {
	config := pi.Mongo
	session, err := mgo.Mongo(config.Host + ":" + strconv.Itoa(config.Port))
	if err != nil {
		panic(err)
	}

	return session
}

func getDB(session *mgo.Session) mgo.Database {
	return session.DB(lockerDbName)
}

func state(db *mgo.Database) func(http.ResponseWriter, *http.Request) {
	tracks := db.C("amusic_track")

	return func(w http.ResponseWriter, r *http.Request) {
		count, err := tracks.Count()
		if err != nil {
			panic(err)
		}

		last := struct {
			Id bson.ObjectId `bson:"_id"`
		}{}
		err = tracks.Find(nil).Select(bson.M{"_id": 1}).Sort(bson.M{"_id": -1}).One(&last)
		if err != nil {
			panic(err)
		}

		// Need to find out what constitutes "ready"; hardcoded for now
		json.NewEncoder(w).Encode(CollectionState{1, count, time.Seconds(), last.Id.Hex()})
	}
}

func resetCollection(db *mgo.Database, collection string, config *ProcessInfo) {
	db.C(collection).DropCollection()
	if _, err := http.Get(config.LockerUrl + "/Me/search/reindexForType?type=music"); err != nil {
		log.Println("Search reset error: " + err.String())
	}
}

func addLastfmTrack(collection *mgo.Collection, track *lastfmTrack) {
	ids := make([]CandidateId, 1)
	ids[0] = CandidateId{Type: "lastfm", Id: track.URL}
	duration, err := strconv.Atoi64(track.Duration)
	if err != nil {
		log.Println("Unable to convert duration to integer value.", track.Duration)
	}

	if err := collection.Insert(Track{IdBundle: ids, Name: track.Name, Artist: track.Artist.Name, Duration: duration}); err != nil {
		log.Println("Unable to insert into MongoDB: ", err.String())
	}
}

func readLastfmStream(collection *mgo.Collection, r io.Reader) {
	decoder := json.NewDecoder(r)
	for {
		var track lastfmTrack
		if err := decoder.Decode(&track); err != nil {
			log.Println(err)
			return
		}

		addLastfmTrack(collection, &track)
	}
}

func pullTracks(collection *mgo.Collection, config *ProcessInfo, source string) {
	pieces := strings.Split(source, "/")
	dataType := pieces[0]
	svcId := pieces[1]

	url := config.LockerUrl + "/" + path.Join("Me", svcId, "getCurrent", dataType) + "?stream=true"
	log.Println("Pulling tracks from " + url)
	r, err := http.Get(url)
	if err != nil {
		log.Println("pullTracks failed: ", err)
		return
	}

	switch svcId {
	case "lastfm":
		readLastfmStream(collection, r.Body)
	case "rdio":
		// handler go here
	default:
		log.Println("Don't know how to handle service " + svcId)
	}
}

func syncTracks(db *mgo.Database, config *ProcessInfo) {
	collection := db.C(trackCollectionName)
	for _, source := range trackSources {
		go pullTracks(&collection, config, source)
	}
}

func validType(t string) (b bool) {
	for _, v := range types {
		if t == v {
			return true
		}
	}

	return false
}

func gatherMusic(db *mgo.Database, config *ProcessInfo, r *url.URL) {
	updateType := r.Query().Get("type")

	if updateType != "" && !validType(updateType) {
		log.Println("Can't update for type: " + updateType)
		return
	}

	switch updateType {
	case "track":
		go syncTracks(db, config)
	case "play":
		// go syncPlays(db, config)
	default:
		resetCollection(db, trackCollectionName, config)
		go syncTracks(db, config)
		// resetCollection(db, playCollectionName, config)
		// go syncPlays(db, config)
	}
}

func update(db *mgo.Database, config *ProcessInfo) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		go gatherMusic(db, config, r.URL)
		fmt.Fprintln(w, "updating collection")
	}
}

func main() {
	config := loadConfig()

	session := mongoSession(config)
	db := getDB(session)
	defer session.Close()

	listener, err := net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa64(config.Port)))
	if err != nil {
		panic(err)
	}

	// net.Listen will choose a port if port 0 is passed in (or omitted).
	if config.Port == 0 {
		_, port, err := net.SplitHostPort(listener.Addr().String())
		if err != nil {
			panic(err)
		}

		portnum, err := strconv.Atoi64(port)
		if err != nil {
			panic(err)
		}
		config.Port = portnum
	}

	// Make sure lservicemanager knows on which port the collection is listening.
	json.NewEncoder(os.Stdout).Encode(config)

	// Configure routes.
	http.HandleFunc("/state", state(&db))
	http.HandleFunc("/update", update(&db, config))

	// Actually run the server.
	err = http.Serve(listener, nil)
	if err != nil {
		panic(err)
	}
}
