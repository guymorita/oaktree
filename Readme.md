# Oaktree #
### Hatch Server ###
The backend for Hatch. Users authenticate on Oaktree and retrieve their information upon login. Messages are sent to Oaktree and routed to other users. Push notifications are also fired from Oaktree.   
Getting started:  
first, clone the repo, then
>npm install


#### Tech Stack ####
* Node.js / Express - core server
* MongoDB / Mongoose - database
* Azure - remote image storage (similar to Amazon S3)

Hatch utilises the asyncronous non-blocking features of JavaScript and Node.js for the core of the server. User information and basic message data are stored on a Mongo database and image data is hosted on Microsoft Azure, a cloud storage platform.

#### Testing ####
* Mocha / Chai
* [Travis CI](https://travis-ci.org/guymorita/oaktree)
* Coveralls

Testing is done through the Mocha Chai testing suite, and is automated through Grunt.js. It gets test coverage with Travis-CI/Coveralls.


#### Dependencies ####
* Node.js 0.10.x
* Express 3.x
* Mongo DB
* Mongoose
* Microsoft Azure
* Async
* Underscore
* Apple Push Notifications (APN)
* pwd
* MD5
