# roon-splunk-hec
Roon extension for sending zone playback info to a Splunk HEC endpoint

**Getting started**

* Splunk configured to enable HTTP Event Collector (HEC), then create a token with enable string authentication. The full URL with token will look like this note that we are sending to the raw endpoint:
http://{splunk host or ip address}:8088/services/collector/raw?token={token number}
Testing your Splunk HEC with a simple CURL command is recommended.

* Download and install the NodeJS runtime: https://nodejs.org. Then use the following command to start the extension:
  1. `npm install`
  1. `node . --webhook=[splunk HEC URL]`


* Final step is to activate the extension in Roon. Go to Settings -> Extensions. Find "Roon Splunk HEC" and click the "Enable" button.
