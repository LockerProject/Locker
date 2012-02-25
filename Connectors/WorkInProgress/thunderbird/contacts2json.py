#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

#!/usr/bin/python

import sys
import os
import datetime
import getopt
import json

"""
-----------------------------------------------------------------------------
This script converts thunderbird contact in tsv format to the json format for
lockers.

The script takes as input a tsv file and an output file name.

Examples of running this command are:

python contacts2json.py --input=input.tsv --output=output.json

python indexer.py -i input.tsv -o output.json

Use the -h or the --help flag to get a listing of options.

Program: contacts2json.py
Author: Dennis E. Kubes
Date: December 7, 2010
Revision: 1.0

Revision    | Author            | Comment
-----------------------------------------------------------------------------
1.0         Dennis E. Kubes     Initial creation of script.
-----------------------------------------------------------------------------
"""

"""
Ensures an absolute path.
"""
def ensureAbsPath(toAbsFile):
  # ensure an absolute path and ends with file separator
  temp = toAbsFile
  if not os.path.isabs(temp):
    temp = os.path.abspath(temp)
  return temp


"""
Converts the tsv contacts input file to locker json output file
"""
def convertContactsToLockerJson(inputFile, outputFile):

  inputFileObj = open(ensureAbsPath(inputFile), "r")
  outputFileObj = open(ensureAbsPath(outputFile), "w")
  
  for line in inputFileObj:
  
    fields = line.split("\t");
    name = fields[2]
    nickname = fields[3]
    email = fields[4]
    
    hasName = (name != "")
    hasNick = (nickname != "")
    hasEmail = (email != "")
    
    if hasName or hasNick or hasEmail:
      contact = {}
      if hasName:
        contact["name"] = fields[2]
      if hasNick:
        contact["nickname"] = fields[3]
      if hasEmail:
        contact["email"] = fields[4]
      contactJson = json.dumps(contact)
      outputFileObj.write(contactJson + "\n")

  inputFileObj.close()
  outputFileObj.close()

"""
Prints the usage help message
"""
def usage():
  usage = ["contacts2json.py runs the contacts to locker json converter\n"]
  usage.append("[-h --help][-i --input][-o --output]\n")
  usage.append("    -h --help: Prints this usage message\n")
  usage.append("    -i --input: The input tab separated file.\n")
  usage.append("    -o --output: The output locker json file.\n")
  message = "".join(usage)
  print message

"""
Main method.  Parses input variables and kicks off conversion process.
"""
def main(argv):

  try:
    cmdstr = "hi:o:"
    cmdlist = ["help", "input=", "output="]
    opts, args = getopt.getopt(argv, cmdstr, cmdlist)
  except getopt.GetoptError:
    "Unexpected error:", sys.exc_info()[0]
    usage()
    sys.exit(2)

  inputFile = ""
  outputFile = ""

  # loop through command line options
  for opt, arg in opts:
    if opt in ("-h", "--help"):
      usage()
      sys.exit()
    elif opt in ("-i", "--input"):
      inputFile = arg
    elif opt in ("-o", "--output"):
      outputFile = arg
      
  if inputFile == "" or outputFile == "":
    usage()
    sys.exit()    
            
  # convert the input tsv to output json
  print "Starting conversion from tsv to locker json"
  convertContactsToLockerJson(inputFile, outputFile)
  print "Finished conversion process"

if __name__ == "__main__":
  main(sys.argv[1:])
