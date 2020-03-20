import * as functions from 'firebase-functions';
import * as firebase from "firebase-admin"
import * as cors from "cors"
import { IClientDocument, ACCESS_TOKEN_LENGHT, IClientRegisterInfo } from "../../../common/types"
import { randomBytes } from "crypto"

firebase.initializeApp()
var firestore = firebase.firestore()
var auth = firebase.auth()

const corsMiddleware = cors({
    origin: true
})


// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

export const testFunction = functions.https.onRequest((request, response) => {
    response.send("Hello world")
})

function verifyUserId(id: string) {
    return new Promise<string>((resolve, reject) => {
        auth.getUser(id).then(() => {
            resolve(id)
        }).catch(() => {
            auth.getUserByEmail(id).then(v => {
                resolve(v.uid)
            }).catch(() => {
                reject(new Error(`User ${id} not found`))
            })
        })
    })
}

export const registerClient = functions.https.onRequest((request, response) => {
    if ("name" in request.body && "owner" in request.body) {
        verifyUserId(request.body.owner).then(valid => {
            if (valid) {
                var accessToken = randomBytes(ACCESS_TOKEN_LENGHT).toString("hex")
                firestore.collection("clients").add({
                    name: request.body.name,
                    accessToken,
                    allowedUsers: [request.body.owner],
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
                response.status(404).send("User with id not found")
            }
        })
    } else {
        response.status(400).send("Invalid request body")
    }
})

export const deleteClient = functions.https.onRequest(async (request, response) => {
    var data = request.body as IClientRegisterInfo
    if ("id" in data && "accessToken" in data) {
        let doc = await firestore.collection("clients").doc(data.id).get()
        if (doc.exists) {
            const docData = doc.data() as FirebaseFirestore.DocumentData
            if (docData.accessToken == docData.accessToken) {
                await firestore.collection("clients").doc(data.id).delete()
                response.status(200).send({})
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

export const getClientConfig = functions.https.onRequest(async (request, response) => {
    corsMiddleware(request, response, async () => {
        var data = request.body as IClientRegisterInfo
        var isSDK = false
        if ("data" in data) {
            // @ts-ignore The functions SDK puts all data in a object, but the client puts it at root
            data = data.data
            isSDK = true
        }

        if ("id" in data && "accessToken" in data) {
            let doc = await firestore.collection("clients").doc(data.id).get()
            if (doc.exists) {
                const docData = doc.data() as IClientDocument
                if (docData.accessToken == docData.accessToken) {
                    var userEmails = await Promise.all(docData.allowedUsers.map(async v => {
                        try {
                            return (await auth.getUser(v)).email
                        } catch (err) {
                            return "[ invalid ]"
                        }
                    }))
                    if (isSDK) response.status(200).send({ data: { ...docData, userEmails } })
                    else response.status(200).send({ ...docData, userEmails })
                } else {
                    response.status(403).send("Wrong access token")
                }
            } else {
                response.status(404).send("Document not found")
            }
        } else {
            response.status(400).send("Invalid request body " + JSON.stringify(request.body))
        }
    })
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
    corsMiddleware(request, response, async () => {
        var data = request.body as IClientRegisterInfo & { add: string[], remove: string[] }
        var isSDK = false
        if ("data" in data) {
            // @ts-ignore The functions SDK puts all data in a object, but the client puts it at root
            data = data.data
            isSDK = true
        }
        
        if ("id" in data && "accessToken" in data && "add" in data && data.add instanceof Array && "remove" in data && data.remove instanceof Array) {
            try {
                var add = await Promise.all(data.add.map(v => verifyUserId(v)))
                var remove = await Promise.all(data.remove.map(v => verifyUserId(v)))
            } catch (err) {
                response.status(404).send(err.message)
                return
            }

            let doc = await firestore.collection("clients").doc(data.id).get()
            if (doc.exists) {
                const docData = doc.data() as IClientDocument
                if (docData.accessToken == docData.accessToken) {
                    let allowedUsers = docData.allowedUsers.filter(v => remove.indexOf(v) == -1)

                    add.forEach(v => { if (allowedUsers.indexOf(v) == -1) allowedUsers.push(v) })

                    if (allowedUsers.length == 0) {
                        response.status(400).send(`One user must remain allowed`)
                        return
                    }

                    doc.ref.update({ allowedUsers: allowedUsers } as IClientDocument)
                        .then(() => {
                            if (isSDK) response.status(200).send({ data: { success: true } })
                            else response.status(200).send({ success: true })
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

export const changeUserEmail = functions.https.onCall(async (data: { email: string }, context) => {
    if (!("email" in data)) return new functions.https.HttpsError("invalid-argument", "", "Missing email")
    if (!context.auth) return new functions.https.HttpsError("unauthenticated", "")
    try {
        await auth.updateUser(context.auth.uid, {
            email: data.email
        })
    } catch (err) {
        return new functions.https.HttpsError("not-found", "", err.message)
    }
    return { success: true }
})