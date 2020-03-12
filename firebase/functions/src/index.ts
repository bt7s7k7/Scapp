import * as functions from 'firebase-functions';
import * as firebase from "firebase-admin"
firebase.initializeApp()
var firestore = firebase.firestore()

import { IClientDocument, ACCESS_TOKEN_LENGHT, IClientRegisterInfo } from "../../../common/types"
import { randomBytes } from "crypto"

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

export const testFunction = functions.https.onRequest((request, response) => {
    response.send("Hello world")
})

export const registerClient = functions.https.onRequest((request, response) => {
    if ("name" in request.body) {
        var accessToken = randomBytes(ACCESS_TOKEN_LENGHT).toString("hex")
        firestore.collection("clients").add({
            name: request.body.name,
            accessToken,
            allowedUsers: [],
            url: ""
        } as IClientDocument).then(doc => {
            response.status(200).send({
                accessToken,
                id: doc.id
            } as IClientRegisterInfo)
        }).catch(err => {
            response.status(500).send(err.toString())
        })
    } else {
        response.status(400).send("Invalid request body")
    }
})

export const getClientConfig = functions.https.onRequest(async (request, response) => {
    var data = request.body as IClientRegisterInfo
    if ("id" in data && "accessToken" in data) {
        let doc = await firestore.collection("clients").doc(data.id).get()
        if (doc.exists) {
            const docData = doc.data() as FirebaseFirestore.DocumentData
            if (docData.accessToken == docData.accessToken) {
                response.status(200).send(docData)
            }
        } else {
            response.status(404).send("Document not found")
        }
    } else {
        response.status(400).send("Invalid request body")
    }
})

