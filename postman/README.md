Smart App — Postman files

Files created:
 - visual-dictionary-backend\postman\SmartAppCollection.json
 - visual-dictionary-backend\postman\SmartAppEnvironment.json

Import both into Postman (File -> Import), select the environment, then run the requests.

The script signed in to Firebase and saved an idToken into the environment variable "idToken". If you want to refresh the token, run the "Auth: Login (manual)" request in Postman (it will update idToken automatically).

Example file used for multipart upload (Create image): seagull-perched-on-rock-421015772.jpg
