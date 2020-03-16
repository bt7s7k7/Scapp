import * as functions from 'firebase-functions';
import * as firebase from "firebase-admin"
firebase.initializeApp()
var firestore = firebase.firestore()
var auth = firebase.auth()

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
            } else {
                response.status(403).send("Wrong access token")
            }
        } else {
            response.status(404).send("Document not found")
        }
    } else {
        response.status(400).send("Invalid request body")
    }
})

export const renameClient = functions.https.onRequest(async (request, response) => {
    var data = request.body as IClientRegisterInfo & { name: string }
    if ("id" in data && "accessToken" in data && "name" in data) {
        let doc = await firestore.collection("clients").doc(data.id).get()
        if (doc.exists) {
            const docData = doc.data() as FirebaseFirestore.DocumentData
            if (docData.accessToken == docData.accessToken) {
                doc.ref.update({ name: data.name })
                    .then(() => {
                        response.status(200).send({
                            success: true
                        })
                    }).catch(err => {
                        response.status(500).send(err.toString())
                    })
            } else {
                response.status(403).send("Wrong access token")
            }
        } else {
            response.status(404).send("Document not found")
        }
    } else {
        response.status(400).send("Invalid request body")
    }
})

export const setClientUrl = functions.https.onRequest(async (request, response) => {
    var data = request.body as IClientRegisterInfo & { url: string }
    if ("id" in data && "accessToken" in data && "url" in data) {
        let doc = await firestore.collection("clients").doc(data.id).get()
        if (doc.exists) {
            const docData = doc.data() as IClientDocument
            if (docData.accessToken == docData.accessToken) {
                doc.ref.update({ url: data.url })
                    .then(() => {
                        response.status(200).send({
                            success: true
                        })
                    }).catch(err => {
                        response.status(500).send(err.toString())
                    })
            } else {
                response.status(403).send("Wrong access token")
            }
        } else {
            response.status(404).send("Document not found")
        }
    } else {
        response.status(400).send("Invalid request body")
    }
})


export const changeClientAllowedUsers = functions.https.onRequest(async (request, response) => {
    var data = request.body as IClientRegisterInfo & { add: string[], remove: string[] }
    if ("id" in data && "accessToken" in data && "add" in data && data.add instanceof Array && "remove" in data && data.remove instanceof Array) {
        let doc = await firestore.collection("clients").doc(data.id).get()
        if (doc.exists) {
            const docData = doc.data() as IClientDocument
            if (docData.accessToken == docData.accessToken) {
                let allowedUsers = docData.allowedUsers.filter(v => data.remove.indexOf(v) == -1)

                data.add.forEach(v => { if (allowedUsers.indexOf(v) == -1) allowedUsers.push(v) })

                doc.ref.update({ allowedUsers: allowedUsers } as IClientDocument)
                    .then(() => {
                        response.status(200).send({
                            success: true
                        })
                    }).catch(err => {
                        response.status(500).send(err.toString())
                    })
            } else {
                response.status(403).send("Wrong access token")
            }
        } else {
            response.status(404).send("Document not found")
        }
    } else {
        response.status(400).send("Invalid request body")
    }
})

export const verifyUserToken = functions.https.onRequest(async (request, response) => {
    var data = request.body as IClientRegisterInfo & { token: string }
    if ("id" in data && "accessToken" in data && "token" in data) {
        let doc = await firestore.collection("clients").doc(data.id).get()
        if (doc.exists) {
            const docData = doc.data() as IClientDocument
            if (docData.accessToken == docData.accessToken) {
                auth.verifyIdToken(data.token).then(decoded => {
                    response.status(200).send({ valid: true, reason: "" })
                }).catch(err => {
                    response.status(200).send({ valid: false, reason: err })
                })
            } else {
                response.status(403).send("Wrong access token")
            }
        } else {
            response.status(404).send("Document not found")
        }
    } else {
        response.status(400).send("Invalid request body")
    }
})