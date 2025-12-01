Smart App — Postman files

Files created:
 - SmartAppCollection.json
 - SmartAppEnvironment.json

Import both into Postman (File -> Import), select the environment, then run the requests.

The script signed in to Firebase and saved an idToken into the environment variable "idToken". To refresh the token, run the "Auth: Login (manual)" request in Postman (it will update idToken automatically).
