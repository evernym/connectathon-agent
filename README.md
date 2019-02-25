# Connectathon Agent

> This is a basic CLI agent that implements the below mentioned A2A protocols.

## Current Protocols Supported
[https://hackmd.io/QioQNy-RRm2aosuF-i2UGw](https://hackmd.io/QioQNy-RRm2aosuF-i2UGw)

* [Connection Protocol](https://github.com/hyperledger/indy-hipe/blob/aa5fb2431964f84926af5a51d8e4dd9b6342482e/text/connection-protocol/README.md)
* [Trust Ping](https://github.com/hyperledger/indy-hipe/blob/03656b17d36a0a2a5c59a63192ca85c51230b959/text/trust-ping/README.md)
* [Basic Message](https://github.com/hyperledger/indy-hipe/blob/7df770e4cb3163c1e97b224387fed320bf7d9013/text/basic-message/README.md)

## Getting Started

NOTE: This has only been tested on Ubuntu and Raspian, and may need some tweeking to work on other platforms.

1. Clone this repository
2. Install dependencies with `npm install`
	* Make sure you have `indy-sdk` version 1.8.0 or later installed
3. Create wallet and generate an invitation key by running 
	`./newDID.js -w <wallet name> -k <wallet key>`
4. Paste the new key (not the DID) into config.yml under `invitation_key`. If this is incorrect or not found, the connection process will fail.
5. Run the agent with 

	```
	./index.js -p <port to listen on> -w <wallet name> -k <wallet key> -n <alias used for connections>
	```
6. Run the `help` command for more information from here.
7. Note that the values in `config.yml` will be used if cli parameters are omitted.