require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Report = require('../models/report');

// Simplified linear recency boost matching the updated backend formula
function expectScore(upvotes, comments, severity, hoursAgo) {
    const recencyBoost = Math.max(0, 10 - (hoursAgo / 24));
    return (2 * upvotes) + (1.5 * comments) + (3 * severity) + recencyBoost;
}

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to test DB");

        const testReports = [
            {
                reportId: "TEST_1",
                category: "Other",
                description: "Test 1",
                locationText: "Test Loc 1",
                location: { type: 'Point', coordinates: [72.8777, 19.0760] },
                imageCID: "NO_IMAGE",
                upvotes: 0, commentsCount: 0, severity: 1,
                createdAt: new Date() // 0 hours ago
            },
            {
                reportId: "TEST_2",
                category: "Other",
                description: "Test 2",
                locationText: "Test Loc 2",
                location: { type: 'Point', coordinates: [72.8777, 19.0761] },
                imageCID: "NO_IMAGE",
                upvotes: 10, commentsCount: 5, severity: 3,
                createdAt: new Date(Date.now() - 8 * 3600000) // 8 hours ago
            }
        ];

        // Cleanup before
        await Report.deleteMany({ reportId: { $in: ["TEST_1", "TEST_2"] } });

        // Insert
        await Report.insertMany(testReports);

        // Run aggregation with simplified linear recency boost
        const pipeline = [
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [72.8777, 19.0760] },
                    distanceField: 'distance',
                    maxDistance: 10000,
                    spherical: true,
                    query: { reportId: { $in: ["TEST_1", "TEST_2"] } }
                }
            },
            {
                $addFields: {
                    hours_since_post: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] }
                }
            },
            {
                $addFields: {
                    recencyBoost: {
                        $max: [0, { $subtract: [10, { $divide: ["$hours_since_post", 24] }] }]
                    }
                }
            },
            {
                $addFields: {
                    score: {
                        $add: [
                            { $multiply: [2, { $ifNull: ["$upvotes", 0] }] },
                            { $multiply: [1.5, { $ifNull: ["$commentsCount", 0] }] },
                            { $multiply: [3, { $ifNull: ["$severity", 1] }] },
                            "$recencyBoost"
                        ]
                    }
                }
            },
            { $sort: { score: -1 } }
        ];

        const results = await Report.aggregate(pipeline);

        let passed = true;
        for (const res of results) {
            const expected = expectScore(res.upvotes, res.commentsCount, res.severity, res.hours_since_post);
            const diff = Math.abs(res.score - expected);
            if (diff > 0.01) {
                console.error(`❌ Test failed for ${res.reportId}: Expected ~${expected}, got ${res.score}`);
                passed = false;
            } else {
                console.log(`✅ ${res.reportId} score computed correctly: ${res.score.toFixed(2)}`);
            }
        }

        if (passed) console.log("All trending aggregation tests passed! ✅");

        // Cleanup
        await Report.deleteMany({ reportId: { $in: ["TEST_1", "TEST_2"] } });

    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

runTest();
