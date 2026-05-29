import * as SQLite from "expo-sqlite";
import firestore from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Alert } from "react-native";
import { useCreditStore } from "@/store";
import React, { useState, useEffect } from "react";
import { dynamoDB } from '@/lib/modals';
import { driverProfile, updateDriver } from "@/lib/utils";

// ✅ Initialize Database
let db;

const initLocalDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync("localDB.db");

    // await db.execAsync(`DROP TABLE IF EXISTS cachedPosts ;`);
    // await db.execAsync(`DROP TABLE IF EXISTS driver_stats;`);
    // await db.execAsync(`DROP TABLE IF EXISTS adminData;`);
    //     await db.execAsync(`DROP TABLE IF EXISTS locationData ;`);
    // await db.execAsync(`DROP TABLE IF EXISTS rechargeData;`);
    // await db.execAsync(`DROP TABLE IF EXISTS tips;`);
    //    await db.execAsync(`DROP TABLE IF EXISTS ride_history ;`);
    // await db.execAsync(`DROP TABLE IF EXISTS ride_skips;`);
    //await db.execAsync(`DROP TABLE IF EXISTS fetch_count;`);

await db.runAsync(`
CREATE TABLE IF NOT EXISTS driver_stats (
  driverId TEXT PRIMARY KEY,
  creditAmount REAL DEFAULT 0,
  kmPrice REAL DEFAULT 19,
  nightKilometerPrice REAL DEFAULT 21,
  dailyTripsCount INTEGER DEFAULT 0,
  dailyFareTotal INTEGER DEFAULT 0,
  weeklyFareTotal REAL DEFAULT 0,
  weeklyTripsCount INTEGER DEFAULT 0,
  weeklyStreetPickupCount INTEGER DEFAULT 0,
  monthlyFareTotal REAL DEFAULT 0,
  monthlyTripsCount INTEGER DEFAULT 0,
  monthlyStreetPickupCount INTEGER DEFAULT 0,
  lastFetchedTime INTEGER DEFAULT 0, 
  lastUpdatedTime INTEGER DEFAULT 0,
  referralCommission REAL DEFAULT 0,
  lastResetDaily INTEGER DEFAULT 1742380154,
  lastResetWeekly INTEGER DEFAULT 1742380154,
  lastResetMonthly INTEGER DEFAULT 1742380154
);
`);

 await db.runAsync(`
      CREATE TABLE IF NOT EXISTS adminData (
        driverId TEXT PRIMARY KEY,
        alertText TEXT,
        CBEAccount TEXT,
        Telebirr TEXT,
        acceptableAppVersion TEXT,
        creditMinimum INTEGER,
        VAT REAL,
        VATShared REAL,
        baseFare INTEGER,
        baseFareShared INTEGER,
        distanceRate REAL,
        nightRate REAL,
        timeRate REAL,
        PROMO_END_DATE TEXT
      );
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS locationData (
        driverId TEXT PRIMARY KEY,
        lastKnownLat REAL,
        lastKnownLng REAL,
        locationUpdateSource TEXT,
        locationLog TEXT
      );
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS rechargeData (
        rechargeDate INTEGER PRIMARY KEY,
        rechargeAmount REAL
      );
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS cachedPosts (
        createdAt INTEGER PRIMARY KEY,
        author TEXT,
        category TEXT,
        title TEXT,
        content TEXT,
        karma INTEGER,
        comments INTEGER,
        followerCount INTEGER,
        posterLocation TEXT,
        expoToken TEXT,
        authorAvatar TEXT
      );
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tips (
        id TEXT PRIMARY KEY, 
        title TEXT, 
        details TEXT, 
        category TEXT,
        latitude REAL, 
        longitude REAL, 
        relevance TEXT,
        created_at TEXT,
        last_fetched TEXT
      );
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS ride_history (
        id TEXT PRIMARY KEY,
        driverId TEXT,
        type TEXT,
        originAddress TEXT,
        destinationAddress TEXT,
        userLocation TEXT,
        destinationLocation TEXT,
        farePrice REAL,
        timeTaken TEXT,
        createdAt TEXT,
        CoriderPickupData TEXT
      );
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS fetch_count (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        count INTEGER DEFAULT 0
      );
    `);

    // Ensure rows for tips (id = 1) and posts (id = 2) exist
    await db.runAsync(`
      INSERT OR IGNORE INTO fetch_count (id, count)
      VALUES (1, 0), (2, 0);
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS socialfollowing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        posterId TEXT UNIQUE NOT NULL
      );
    `);

    await db.runAsync(`
  CREATE TABLE IF NOT EXISTS ride_skips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driverId TEXT NOT NULL,
    rideId TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);

await db.runAsync(`
  CREATE TABLE IF NOT EXISTS ride_cancellations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driverId TEXT NOT NULL,
    rideId TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);

await db.runAsync(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY,
    latitude REAL,
    longitude REAL,
     title TEXT,
    details TEXT,
    date INTEGER
  )
`);

await db.runAsync(`
  CREATE TABLE IF NOT EXISTS active_ride (
    driverId TEXT PRIMARY KEY,
    rideId TEXT ,
    originLat REAL,
    originLng REAL,
  destLat REAL, 
  destLng REAL,
  soloType TEXT,
    timestamp INTEGER DEFAULT 1742380154,
    status TEXT DEFAULT 0
  );
`);

await db.runAsync(
  `CREATE TABLE IF NOT EXISTS active_shared_ride (
    driverId TEXT PRIMARY KEY,
    rideId TEXT,
    originLat REAL,
    originLng REAL,
    dropOffPoints TEXT, -- Store as JSON string
    coriderPickupData TEXT, -- Store pickup details as JSON string
    startTime INTEGER,
    trackingState INTEGER,
    remainingPassengers INTEGER,
    requestTime TEXT,
    status TEXT DEFAULT 0
  );`
);
    await db.runAsync(`
CREATE TABLE IF NOT EXISTS ratedTips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tip_id TEXT NOT NULL,
  rating INTEGER,
  UNIQUE(user_id, tip_id)
);
`);

  } catch (error) {

  }
};


const driverRegisterLocal = async (driverId, pnumber, creditAmount, referralCommission, shareUsername, isSuspended, tierType, expoToken) => {

  // Ensure the database is initialized
  if (!db) {

    await initLocalDB(); // Initialize DB if not already initialized
  }

  try {
    // Check if tables exist before proceeding
    const tableCheck = await db.getAllAsync(`
      SELECT name FROM sqlite_master WHERE type='table' 
      AND name IN ( 'driver_stats')
    `);

    const tableNames = tableCheck.map(row => row.name);

    if ( !tableNames.includes('driver_stats') ) {

      await initLocalDB();
    }

await db.runAsync(
  `INSERT INTO driver_stats (driverId, creditAmount, referralCommission)
   VALUES (?, ?, ?)
   ON CONFLICT(driverId) DO UPDATE SET 
     creditAmount = excluded.creditAmount, 
     referralCommission = excluded.referralCommission;`,
  [driverId, creditAmount, referralCommission]
);

  } catch (error) {

  }
};


// ✅ Increment fetch count for tips or posts
const incrementFetchCount = async (type) => {
  const id = type === "tips" ? 1 : 2;

  try {
    // Use UPSERT pattern since we know rows exist
    await db.runAsync(`
      UPDATE fetch_count 
      SET count = count + 1 
      WHERE id = ?;
    `, [id]);

    ////console .log(`${type} fetch count incremented.`);
  } catch (error) {

  }
};

// ✅ Get total fetch count for tips or posts
const getTotalFetchCount = async (type) => {
  const id = type === "tips" ? 1 : 2;

  try {
    // Simplified query since we know rows exist
    const result = await db.getFirstAsync(`
      SELECT count FROM fetch_count WHERE id = ?;
    `, [id]);
    if(result) //console.log("✅  result.count", result.count)
    return result ? result.count : 0;
  } catch (error) {

    return 0;
  }
};

// const getLimits = async () => {
//   try {
//      const tierDoc = await firestore().collection("admin").doc("tierData").get();

//         const tierData = tierDoc.data();
//         const { tierLimits } = tierData;
//            console.log("tier limits ✅✅✅✅✅✅✅✅✅ in etLimis is: ", tierLimits, "tierLimits", tierData, "tierData")
//       return tierLimits;
//   } catch (error) {
//     console.error("❌ Error fetching tier limits:", error);
//     return null;
//   }
// };

const getLimits = async () => {
  try {
    const res = await fetch("https://app.share-rides.com/tier-limits");
    const data = await res.json();
    console.log("✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅getLimits data", data)
    const { tierLimits } = data;
    return tierLimits;
  } catch (error) {

    return null;
  }
};


// ✅ Store Firestore Data Locally
const storeDriverDataLocally = async (driverData, driverId) => {
  try {
    const lastFetchedTime = Math.floor(Date.now() / 1000); // Store Unix timestamp

    await db.runAsync(
    `UPDATE driver_stats SET
    lastFetchedTime = ?
  WHERE driverId = ?`,
      [
        lastFetchedTime,
        driverData.driverId,
      ]
    );

  } catch (error) {

  }
};



// ✅ mark Driver Data As Updated Locally
const markDriverDataAsUpdated = async (driverId) => {
  try {
    const lastUpdatedTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds

    await db.runAsync(
      `UPDATE driver_stats 
      SET lastUpdatedTime = ? 
      WHERE driverId = ?;`,
      [lastUpdatedTime, driverId]
    );
    //console.log(`Driver data for ${driverId} marked as updated.`);
  } catch (error) {

  }
};

const fetchLocalDriverData = async (driverId) => {
  try {

    const statsResult = await db.getAllAsync(
      `SELECT * FROM driver_stats WHERE driverId = ?`,
      [driverId]
    );

    if (statsResult.length === 0) {

    }

    // Merge results if data exists in at least one table
    if ( statsResult.length > 0 ) {
      return statsResult[0]
    } else {

      return null;
    }
  } catch (error) {

    return null;
  }
};

// ✅ Fetch Local Location Data
const fetchLocalLocationData = async (driverId) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM LocationData WHERE driverId = ?;`,
      [driverId]
    );

    if (result.length > 0) {
     return result[0];
    } else {
     return null;
    }
  } catch (error) {

  }
};

// ✅ Sync Local Data Back to Firestore
const uploadLocalDataToFirestore = async (driverId) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM driver_stats
       WHERE driverId = ?`,
      [driverId]
    );
      const { completionPercentage, totalRides, skippedCount, canceledCount } = await getDriverPerformance(driverId);

      if (result.length > 0) {
      const driverData = result[0];
      const driverRef = firestore().collection('drivers').doc(driverId);
      if(driverData.weeklyTripsCount === null)
        return;
 //console.log(`✅✅✅✅✅✅ Completion Rate in uploadLocalDataToFirestore`, compRate, "%", completionPercentage, "%", driverData, "driverData");      
      // await driverRef.update({
      //   driverPerformance: [parseFloat(completionPercentage), totalRides|| 0, skippedCount, canceledCount],
      //   completionPercentage: parseFloat(completionPercentage),
      //   // rideSummary: {
      //   //   dailyFareTotal: driverData.dailyFareTotal,
      //   //   dailyTripsCount: { count: driverData.dailyTripsCount, createdAt: driverData.lastResetDaily },
      //   //   weeklyFareTotal: driverData.weeklyFareTotal,
      //   //   weeklyTripsCount: { count: driverData.weeklyTripsCount, createdAt: driverData.lastResetWeekly },
      //   //   weeklyStreetPickupCount: { count: driverData.weeklyStreetPickupCount },
      //   //   monthlyTripsCount: { count: driverData.monthlyTripsCount, createdAt: driverData.lastResetMonthly },
      //   //   monthlyFareTotal: driverData.monthlyFareTotal,
      //   // },
      // });

    //       await  updateDriver(driverId, {
    // performance: [parseFloat(completionPercentage), totalRides|| 0, skippedCount, canceledCount]
    //   })

      await markDriverDataAsUpdated(driverId); // Updates lastUpdatedTime
    }
  } catch (error) {

  }
};


// ✅ check whether it's time to fetch Data from Firestore
const shouldDownloadData = async (driverId) => {
  try {
    const result = await db.getFirstAsync(
      `SELECT lastFetchedTime FROM driver_stats WHERE driverId = ?;`,
      [driverId]
    );

    if (!result || !result.lastFetchedTime) return true; // If no timestamp, sync immediately

    const lastFetched = result.lastFetchedTime;
    const currentTime = Math.floor(Date.now() / 1000);
    const twelveHoursInSeconds = 24 * 60 * 60;

    return currentTime - lastFetched >= twelveHoursInSeconds; // Sync if 12+ hours passed
  } catch (error) {

    return true; // Default to syncing if there's an error
  }
};

// ✅ check whether to upload Local Data to Firestore
const shouldUploadData = async (driverId) => {
  try {
    const result = await db.getFirstAsync(
      `SELECT lastUpdatedTime FROM driver_stats WHERE driverId = ?;`,
      [driverId]
    );

    if (!result || !result.lastUpdatedTime) return true; // If no timestamp, sync immediately

    const lastUpdated = result.lastUpdatedTime;
    const currentTime = Math.floor(Date.now() / 1000);
    const twelveHoursInSeconds = 24 * 60 * 60;

    return true
    //currentTime - lastFetched >= twelveHoursInSeconds; // Sync if 12+ hours passed
  } catch (error) {

    return true; // Default to syncing if there's an error
  }
};

const isVersionOutdated = (current, required) => {
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  for (let i = 0; i < requiredParts.length; i++) {
    if ((currentParts[i] || 0) < requiredParts[i]) {
      return true; // Current version is outdated
    } else if ((currentParts[i] || 0) > requiredParts[i]) {
      return false; // Current version is newer
    }
  }
  return false; // Versions are the same
};

export const checkHourAndFetchUpload = async (
  driverId, setDriverData, setAdminData, setDriverStats, setCreditStore,
  shouldDownloadData, shouldUploadData, isSuspended, isOutdated, setIsSuspended, setIsOutdated, setShareUsername, setProfileImageUrl, setTierStore
) => {
  try {
    let data = null;
    if (shouldUploadData) {
      await uploadLocalDataToFirestore(driverId);
      const localDriverData = await fetchLocalDriverData(driverId);

    }

    if (shouldDownloadData) {
    //     if (3 > 2) {
      // Fetch driver data from Firestore
      const driverDoc = await firestore().collection("drivers").doc(driverId).get();

      if (!driverDoc.exists) {

      } else {
        data = driverDoc.data();
        await storeDriverDataLocally(data, driverId );

        const { rideSummary } = data;
    //         setDriverStats ({
    //  dailyTripsCount: rideSummary.dailyTripsCount.count, dailyFareTotal: rideSummary.dailyFareTotal, weeklyFareTotal: rideSummary.weeklyFareTotal, weeklyTripsCount: rideSummary.weeklyTripsCount.count, 
    //  weeklyStreetPickupCount: rideSummary.weeklyStreetPickupCount.count, monthlyFareTotal: rideSummary.monthlyFareTotal, monthlyTripsCount: rideSummary.monthlyTripsCount.count
    // })
      }
    }

    // Fetch local data AFTER Firestore fetch
    const localDriverData = await fetchLocalDriverData(driverId);
    //console.log("localDriverData on the 1st load:", localDriverData);

    if (!localDriverData) {

      return;
    }

    // Destructure values safely from the local data
    const {
      creditAmount = 0, kmPrice, weeklyFareTotal = 0, weeklyTripsCount = 0, weeklyStreetPickupCount = 0, monthlyTripsCount = 0, 
      monthlyFareTotal = 0, detailsFilled, documentsSent, pnumber, nightKilometerPrice, pioneer, tierType 
    } = localDriverData;

    // Efficient batch state update
    setDriverData(localDriverData);
  } catch (error) {

  }
};

async function updateLocalDriverLocation(driverId, { latitude, longitude, source, locationLog }) {
  // Convert locationLog array to JSON string for storage
  const logString = JSON.stringify(locationLog);

await db.runAsync(
      `INSERT OR REPLACE INTO locationData 
      (driverId, lastKnownLat, lastKnownLng, locationUpdateSource, locationLog) 
      VALUES (?, ?, ?, ?, ?);`,
      [
        driverId,
        latitude,
        longitude,
         source,
        logString,
      ]
    );

}
const fetchAdminData = async (setIsOutdated) => {
  try {
    const res = await fetch("https://server-7az0.onrender.com/admin-settings");
    const adminData = await res.json();
    const currentAppVersion = Application.nativeApplicationVersion;
    const acceptableVersion = adminData.acceptable_app_version;
    const isOutdated = acceptableVersion && isVersionOutdated(currentAppVersion, acceptableVersion);
    setIsOutdated(isOutdated);

    return adminData;
  } catch (error) {

    return null;
  }
};


const updateLocalCountData = async (driverId, updatedRideSummary) => {
  try {
    //console .log("updatedRideSummary in ✅ ⚠️ ⚠️ ⚠️ ⚠️ updateLocalCountData directly from End ride screen:", updatedRideSummary,  ".....................", updatedRideSummary.weeklyTripsCount, updatedRideSummary.monthlyTripsCount, updatedRideSummary.weeklyFareTotal, updatedRideSummary.monthlyFareTotal,)

  const result = await db.runAsync(
      `UPDATE driver_stats 
       SET dailyTripsCount = ?, dailyFareTotal = ?, weeklyTripsCount = ?, monthlyTripsCount = ?, 
           weeklyFareTotal = ?, monthlyFareTotal = ? 
       WHERE driverId = ?`,
      [
        updatedRideSummary.dailyTripsCount, updatedRideSummary.dailyFareTotal, updatedRideSummary.weeklyTripsCount, updatedRideSummary.monthlyTripsCount, 
        updatedRideSummary.weeklyFareTotal, updatedRideSummary.monthlyFareTotal, 
        driverId
      ]
    )
  if (result.rowsAffected > 0) {

  } else {

  }
  } catch (error) {

    throw error;
  }
};

const updateLocalStreetCountData = async (driverId, updatedStRideSummary) => {
  try {
    await db.runAsync(
      `UPDATE driver_stats 
       SET weeklyStreetPickupCount = ?, monthlyStreetPickupCount = ? 
       WHERE driverId = ?`,
      [
        updatedStRideSummary.weeklyStreetPickupCount, updatedStRideSummary.monthlyStreetPickupCount, 
        driverId
      ]
    );
  } catch (error) {

    throw error;
  }
};


export const handleRecharge = async (driverId, creditBalance ) => {
  try {
    // Safely parse current balance (default to 0 if invalid)
    const currentBalance = Math.max(0, Number(creditBalance) || 0);
const data = await driverProfile(driverId, "user_id")
     if (!data) { 
     return; }  
     if (!data.approved_recharge || !data.approved_recharge.rechargeAmount) {
   return;
    }
        const { approved_recharge, credit_amount } = data;   
    const { rechargeDate, rechargeAmount } = approved_recharge;
    // Validate recharge amount
    const parsedRecharge = parseFloat(rechargeAmount) || 0;
   // console.log(rechargeAmount, "rechargeAmount", parsedRecharge, "parsedRecharge")

// Check if this recharge date already exists in the local rechargeData table.
const result = await db.getFirstAsync(
  `SELECT rechargeDate FROM rechargeData WHERE rechargeDate = ?;`,
  [rechargeDate]
);

//console.log("rechargeDate result", result)
if (result) {
  return;
}
    // Insert or update the recharge record in the rechargeData table.
    await db.runAsync(
      `INSERT INTO rechargeData (rechargeDate, rechargeAmount) 
       VALUES (?, ?) 
       ON CONFLICT(rechargeDate) DO UPDATE 
       SET rechargeAmount = excluded.rechargeAmount;`,
      [rechargeDate, parsedRecharge]
    );
  const updatedBalance = Number(credit_amount) + parseFloat(rechargeDate);
    // Update the driver's creditAmount in the driverData table.
    await db.runAsync(
      `UPDATE driver_stats  SET creditAmount = ? WHERE driverId = ?;`,
      [updatedBalance, driverId]
    );
 // setCreditBalance(updatedBalance);
  try {
    await db.execAsync(`DROP TABLE IF EXISTS fetch_count;`);
        await db.runAsync(`
      CREATE TABLE IF NOT EXISTS fetch_count (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        count INTEGER DEFAULT 0
      );
    `);
        
    await db.runAsync(`
      INSERT INTO fetch_count (id, count)
      VALUES (1, 0), (2, 0);
    `);

  } catch (error) {

  }

  } catch (error) {

  }
};

export const loginRecharge = async (driverId, rechargeDate, parsedRecharge ) => {
  try {

const result = await db.getFirstAsync(
  `SELECT rechargeDate FROM rechargeData WHERE rechargeDate = ?;`,
  [rechargeDate]
);

//console.log("rechargeDate result", result)
if (result) {
 //console .log("already exists wih value:", result); // Debugging log
  return;
}
    // Insert or update the recharge record in the rechargeData table.
    await db.runAsync(
      `INSERT INTO rechargeData (rechargeDate, rechargeAmount) 
       VALUES (?, ?) 
       ON CONFLICT(rechargeDate) DO UPDATE 
       SET rechargeAmount = excluded.rechargeAmount;`,
      [rechargeDate, parsedRecharge]
    );

  } catch (error) {

  }
};

const fetchUserDataRecharge = async () => {
  try {
    const result = await db.getAllAsync(`SELECT * FROM rechargeData;`); // Fetch all rows
   //console .log("Fetched Recharge Data:", result); // Debugging log
    return result
  } catch (error) {

  }
};



// Fetch cached posts from local SQLite
const fetchCachedPosts = async () => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM cachedPosts ORDER BY createdAt DESC;`
    );

    return result; // No need to extract from rows, as `getAllAsync` returns an array of objects
   //console .log(result, "✅✅✅✅✅✅✅✅✅✅")
  } catch (error) {

    return [];
  }
};


// ✅ Check whether it's time to fetch data from DynamoDB & return local data if fresh
const shouldDownloadTips = async () => {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  try {
    const lastFetched = await db.getFirstAsync(
      `SELECT last_fetched FROM tips LIMIT 1;`
    );

        const localTips = await db.getAllAsync(`SELECT * FROM tips;`);
    if (lastFetched && lastFetched.last_fetched) {
      const lastFetchedDate = new Date(lastFetched.last_fetched);

      if (lastFetchedDate >= oneHourAgo) {
        // Data is fresh, return local tips
        return { shouldFetch: false, localTips };
      }
    }

    // Data is outdated, needs fetching
    return { shouldFetch: true, localTips: localTips };
  } catch (error) {

    return { shouldFetch: true, localTips: [] }; // Default to fetching on error
  }
};

// Store posts in the local SQLite cache
const storePostsLocally = async (posts) => {
  try {
    for (const post of posts) {
       const existingTip = await db.getFirstAsync(`SELECT createdAt FROM cachedPosts WHERE createdAt = ?;`, [post.createdAt]);
      if (existingTip) {
        // If the new post exists already, don't store it
         await db.runAsync(`DELETE FROM cachedPosts WHERE createdAt = ?;`, [post.createdAt]);

      }
      await db.runAsync(
        `INSERT OR REPLACE INTO cachedPosts (category, createdAt, author, title, content, karma, comments, posterLocation, expoToken, authorAvatar)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          post.category,
          post.createdAt,
          post.author,
          post.title,
          post.content,
          post.karma,
          post.comments,
          post.posterLocation,
          post.expoToken,
          post.authorAvatar,
        ]
      );
    }

  } catch (error) {

  }
};

// ✅ Store tips in the local SQLite cache while ensuring no duplicates & removing outdated tips
const storeTipsLocally = async (tips) => {
  const now = new Date().toISOString();

  try {
    for (const tip of tips) {
      // Check if the tip already exists
      const existingTip = await db.getFirstAsync(`SELECT id FROM tips WHERE created_at = ?;`, [tip.created_at]);

      if (existingTip) {
        continue; // Skip inserting existing tips
      }

      // Insert the new tip if it doesn't exist
      await db.runAsync(
        `INSERT INTO tips 
        (id, title, details, category, latitude, longitude, relevance, created_at, last_fetched)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [tip.id, tip.title, tip.details, tip.category, tip.latitude, tip.longitude, tip.relevance, tip.created_at, now]
      );
    }

  } catch (error) {

  }
};

// ✅ Delete outdated tips from SQLite
const deleteOutdatedTips = async (tips) => {
  try {
    for (const tip of tips) {
      if (tip.relevance === "outdated") {
      //  await db.runAsync(`DELETE FROM tips WHERE id = ?;`, [tip.id]);
      }
    }

  } catch (error) {

  }
};

const checkAndResetTripCounts = async (driverId) => {
  try {
    const currentDate = new Date();
    const today = currentDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
    const currentWeek = getWeekNumber(currentDate);
    const currentMonth = currentDate.getMonth() + 1; // 1 to 12

    // Fetch stored timestamps
    const result = await db.getFirstAsync(
      `SELECT lastResetDaily, lastResetWeekly, lastResetMonthly FROM driver_stats WHERE driverId = ?`,
      [driverId]
    );

    if (result) {
      const { lastResetDaily, lastResetWeekly, lastResetMonthly } = result;

      // Reset daily if the stored date is different from today
      if (lastResetDaily !== today) {
        await db.runAsync(
          `UPDATE driver_stats SET dailyTripsCount = 0, dailyFareTotal = 0, lastResetDaily = ? WHERE driverId = ?`,
          [today, driverId]
        );
      }
      
      // Ensure lastResetWeekly is parsed as a Date before calling getWeekNumber
      const lastWeek = lastResetWeekly ? getWeekNumber(new Date(lastResetWeekly)) : null;

      if (lastWeek !== currentWeek) {
        await db.runAsync(
          `UPDATE driver_stats SET weeklyTripsCount = 0, weeklyFareTotal = 0, weeklyStreetPickupCount = 0, lastResetWeekly = ? WHERE driverId = ?`,
          [today, driverId]
        );
      }

      // Ensure lastResetMonthly is parsed as a Date before calling getMonth()
      const lastMonth = lastResetMonthly ? new Date(lastResetMonthly).getMonth() + 1 : null;

      if (lastMonth !== currentMonth) {
        await db.runAsync(
          `UPDATE driver_stats SET monthlyTripsCount = 0, monthlyFareTotal = 0, monthlyStreetPickupCount = 0, lastResetMonthly = ? WHERE driverId = ?`,
          [today, driverId]
        );
      }
    }
  } catch (error) {

  }
};


// Helper function to get the current week number
const getWeekNumber = (date) => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date - startOfYear;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
};

const saveRideToLocalHistory = async (rideDetails) => {
  try {
   //console .log("rideDetails in localDB saveRideToLocalHistory", rideDetails)
    await db.runAsync(
      `INSERT INTO ride_history 
       (id, driverId, type, originAddress, destinationAddress, userLocation, destinationLocation, farePrice, timeTaken, createdAt, CoriderPickupData)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        rideDetails.id,
        rideDetails.driverId,
        rideDetails.type,
        rideDetails.originAddress,
        rideDetails.destinationAddress,
        JSON.stringify(rideDetails.userLocation), 
        JSON.stringify(rideDetails.destinationLocation),
        rideDetails.farePrice,
        rideDetails.timeTaken,
        rideDetails.createdAt,
        rideDetails.type === "corider" ? JSON.stringify(rideDetails.CoriderPickupData) : null
      ]
    );

  } catch (error) {

  }
};

const handleCommissionDeduction = async (farePrice, tierType, setCreditBalance, driverId) => {
  if (!farePrice || !driverId ) return;

  try {
    const response = await fetch("https://server-7az0.onrender.com/calculate-commission", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
body: JSON.stringify({farePrice, driverId, tierType: tierType || "noBenefits"
}),

    });

    if (!response.ok) throw new Error("Failed to calculate commission");

    const { newCreditBalance } = await response.json();
//console .log("newCreditBalance", newCreditBalance)
    setCreditBalance(newCreditBalance);
    // Optionally update local SQLite table if needed, or fetch fresh from server
    await db.runAsync(
      `UPDATE driver_stats SET creditAmount = ? WHERE driverId = ?;`,
      [newCreditBalance, driverId]
    );
  }
catch (error) {
    //console .warn("API commission calculation failed, falling back to local estimate.");
    try { 
      const commissionRate = 0.08;
      const driverData = await driverProfile(driverId);
    if (!driverData || !driverData?.credit_amount) {return}
      const currentBalance = parseFloat(driverData?.credit_amount || "0");
      const commissionAmount = parseFloat((farePrice * commissionRate).toFixed(1));
      const newCreditBalance = parseFloat(Math.max(0, currentBalance - commissionAmount).toFixed(1));

      await updateDriver(driverId, {
        credit_amount: newCreditBalance,
      });

      setCreditBalance(newCreditBalance);
    } catch (fallbackError) {
      //console .error("Fallback commission update also failed:", fallbackError);
    }

    //console .error("handleCommissionDeduction error:", error);
  }
}


// const handleCommissionDeduction = async (farePrice, tierType, setCreditBalance, creditBalance, driverId) => {
//   if (!farePrice) return; // Exit if no fare price

//   try {
//     // Set default commission rate
//     let commissionRate = 0.08;

//     // Fetch credit balance from Firestore if it's null or 0
//     let currentBalance = creditBalance;
//       // const driverDoc = await firestore().collection("drivers").doc(driverId).get();

//       // if (driverDoc.exists) {
//       //   currentBalance = driverDoc.data().creditAmount || 0;
//       // } else {
//       //   console.warn(`🚨 No Firestore document found for driverId: ${driverId}`);
//       //   return;
//       // }
//       const driverData = await driverProfile(driverId)
//            const { credit_amount } = driverData
//             currentBalance = parseFloat(credit_amount)


//     // Calculate and round commission amount
//     const commissionAmount = parseFloat((farePrice * commissionRate).toFixed(1));

//     // Calculate new balance and ensure it's rounded
//     const newCreditBalance = parseFloat(Math.max(0, currentBalance - commissionAmount).toFixed(1));

//     // Update Firestore
//     // await firestore().collection("drivers").doc(driverId).update({
//     //   creditAmount: newCreditBalance,
//     // });

//     await  updateDriver(driverId, {
//     credit_amount: newCreditBalance
//       })
//     // Update SQLite database
//     await db.runAsync(
//       `UPDATE driver_stats SET creditAmount = ? WHERE driverId = ?;`,
//       [newCreditBalance, driverId]
//     );

//     // Update state
//     setCreditBalance(newCreditBalance);

//   } catch (error) {

//   }
// };


const updatePrices = async ({ price, type, other, updateLog, setUpdateLog, driverId }) => {
if(!price || !type){
  return;
}
//console .log("kilometerPrice, nightKilometerPriceHome, updateLog, setUpdateLog, driverId", price, type, updateLog, setUpdateLog, driverId)
  const now = new Date();
  // Filter updates within the last 30 minutes
  const recentUpdates = updateLog.filter(
    (timestamp) => now - new Date(timestamp) <= 30 * 60 * 1000 // 30 minutes in milliseconds
  );

  if (recentUpdates.length >= 3) {
    alert("Please wait a while before attempting to update your prices again.");
    return;
  }

  // Add the current timestamp locally
  const updatedLog = [...recentUpdates, now.toISOString()];
  setUpdateLog(updatedLog);

  try {
    if( type === "night"){
    await  updateDriver(driverId, {
prices: JSON.stringify({
  kmPrice: other,
  nightKilometerPrice: price
}),
})
 //   await firestore().collection('drivers').doc(driverId).update({ nightKilometerPrice: price }); 
        await db.runAsync(
          `UPDATE driver_stats SET nightKilometerPrice = ? WHERE driverId = ?`,
          [price, driverId],
        );
return
    }
    if( type === "day"){
      await  updateDriver(driverId, {
prices: JSON.stringify({
  kmPrice: price,
  nightKilometerPrice: other
}),
})
 // await firestore().collection('drivers').doc(driverId).update({ kmPrice: price });   
          await db.runAsync(
          `UPDATE driver_stats SET kmPrice = ? WHERE driverId = ?`,
          [price, driverId],
        );
      return
    }
   Alert.alert("Success!", "Prices updated successfully!");
  } catch (error) {

   Alert.alert("Failed to update prices.", "Failed to update prices. Please try again.");
  }
};


const checkFollowingStatus = async (posterId) => {
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM socialfollowing WHERE posterId = ?`,
      [posterId]
    );
    return rows.length > 0; // True if user is following, False otherwise
  } catch (error) {

    return false;
  }
};

// Function to add a follow record
const followUser = async (posterId) => {
  try {
    await db.runAsync(
      `INSERT INTO socialfollowing (posterId) VALUES (?)`,
      [posterId]
    );
  } catch (error) {

  }
};

// Function to remove a follow record
const unfollowUser = async (posterId) => {
  try {
    await db.runAsync(
      `DELETE FROM socialfollowing WHERE posterId = ?`,
      [posterId]
    );
  } catch (error) {

  }
};


const dynamoDbData = async (driverId) => {
  try {
    const params = {
      TableName: "Drivers",
      Key: { 
        driverId,  // ✅ Partition Key
        karma: 0   // ✅ Sort Key (MUST BE PROVIDED)
      }
    };

    const data = await dynamoDB.get(params).promise();
    return data.Item; // ✅ This returns the entire driver object
  } catch (error) {

    return null;
  }
};

const getDriverPerformance = async (driverId) => {
  try {
    // Fetch past week completed rides
    const completedRides = await db.getAllAsync(
      `SELECT COUNT(*) AS count FROM ride_history WHERE driverId = ? AND createdAt >= ?;`,
      [driverId, Date.now() - 14 * 24 * 60 * 60 * 1000]
    );

    // Fetch past week skips
    const skippedRides = await db.getAllAsync(
      `SELECT COUNT(*) AS count FROM ride_skips WHERE driverId = ? AND timestamp >= ?;`,
      [driverId, Date.now() - 14 * 24 * 60 * 60 * 1000]
    );

    // Fetch past week cancels
    const canceledRides = await db.getAllAsync(
      `SELECT COUNT(*) AS count FROM ride_cancellations WHERE driverId = ? AND timestamp >= ?;`,
      [driverId, Date.now() - 14 * 24 * 60 * 60 * 1000]
    );

    // Extract counts
    const completedCount = completedRides[0] ? completedRides[0].count : 0;
    const skippedCount = skippedRides[0].count || 0;
    const canceledCount = canceledRides[0].count || 0;

if(skippedCount ===0 && completedCount === 0 && canceledCount === 0){
   return { completionPercentage: 100, totalRides, skippedCount, canceledCount };
}
    // Calculate Completion Percentage
    const totalRides = completedCount + skippedCount + canceledCount;
    const completionPercentage = (completedCount / totalRides).toFixed(2) * 100

    return { completionPercentage, totalRides, skippedCount, canceledCount };
    } catch (error) {

};
}

export { db, dynamoDbData, driverRegisterLocal, getDriverPerformance, checkFollowingStatus, followUser, unfollowUser, updatePrices, handleCommissionDeduction, getLimits, getTotalFetchCount, incrementFetchCount, saveRideToLocalHistory, checkAndResetTripCounts, shouldDownloadTips, storeTipsLocally, deleteOutdatedTips, storePostsLocally, fetchCachedPosts, fetchUserDataRecharge, initLocalDB, fetchAdminData, updateLocalCountData, storeDriverDataLocally, fetchLocalDriverData, fetchLocalLocationData, uploadLocalDataToFirestore, shouldDownloadData, shouldUploadData, updateLocalDriverLocation, updateLocalStreetCountData };
