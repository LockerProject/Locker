package main

import (
	"os"
	"json"
	"http"
	"time"
	"net"
	"strconv"
	"launchpad.net/gobson/bson"
	"launchpad.net/mgo"
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

func state(session *mgo.Session) func(http.ResponseWriter, *http.Request) {
	scrobbles := session.DB("locker").C("asynclets_lastfm_scrobble")

	return func(w http.ResponseWriter, r *http.Request) {
		count, err := scrobbles.Count()
		if err != nil {
			panic(err)
		}

		last := struct {
			Id bson.ObjectId `bson:"_id"`
		}{}
		err = scrobbles.Find(nil).Select(bson.M{"_id": 1}).Sort(bson.M{"_id": -1}).One(&last)
		if err != nil {
			panic(err)
		}

		json.NewEncoder(w).Encode(CollectionState{0, count, time.Seconds(), last.Id.Hex()})
	}
}

func main() {
	config := loadConfig()

	session := mongoSession(config)
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
	http.HandleFunc("/state", state(session))

	// Actually run the server.
	err = http.Serve(listener, nil)
	if err != nil {
		panic(err)
	}
}
