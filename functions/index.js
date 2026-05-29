/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");
const functions = require("firebase-functions/v2"); // v2 for 2nd Gen
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { Expo } = require("expo-server-sdk");

admin.initializeApp();
const firestore = getFirestore();
const expoPush = new Expo();

exports.notifyDriversOnRequest = onDocumentCreated("requests/{requestId}", async (event) => {
  const snapshot = event.data;

  const data = snapshot.data(); 

  const { drivers } = data;

  const messages = await Promise.all(
    drivers.map(async (driverId) => {

      const driverDoc = await firestore.collection("drivers").doc(driverId).get();
      
      if (driverDoc.exists) {
        const token = driverDoc.data().expoToken;

        if (Expo.isExpoPushToken(token)) {

          return {
            to: token,
            sound: "default",
            title: 'Hurry up and accept!',
            body: "New ride request available in your area.",
            data: { requestId: snapshot.id },
          };
        } else {

        }
      } else {

      }
    })
  );

  const validMessages = messages.filter(Boolean);

  if (validMessages.length > 0) {

    await expoPush.sendPushNotificationsAsync(validMessages);

  } else {

  }
});

exports.calculateCommission = functions.https.onCall(async (data, context) => {

const { driverId, farePrice } = data.data;
  const driverRef = firestore.collection("drivers").doc(driverId);

  const driverDoc = await driverRef.get();

  if (!driverDoc.exists) {

    throw new functions.https.HttpsError("not-found", "Driver not found");
  }

  const creditAmount = driverDoc.data().creditAmount || 0;
  const commission = farePrice * 0.06;

  const referrerId = driverDoc.data().recommendedBy?.id;

  await driverRef.update({
    creditAmount: creditAmount - commission,
  });

  if (referrerId) {
    const referralCommission = commission * 0.30;
    const referrerRef = firestore.collection("drivers").doc(referrerId);

    await referrerRef.update({
      referralCommission: admin.firestore.FieldValue.increment(referralCommission),
    });

    const referrerDoc = await referrerRef.get();
    const referrerToken = referrerDoc.data().expoToken;

    if (Expo.isExpoPushToken(referrerToken)) {

      await expoPush.sendPushNotificationsAsync([
        {
          to: referrerToken,
          sound: "default",
          title: 'Congratulations! You just earned commission money!',
          body: `You earned a referral commission of ${referralCommission} Br!`,
        },
      ]);

    } else {

    }
  } else {

  }
});



// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
