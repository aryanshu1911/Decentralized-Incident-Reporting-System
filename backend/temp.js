const mongoose = require('mongoose');
const fs = require('fs');
const uri = 'mongodb://anishmvijayvergia_db_user:Anish123@ac-ex7rby6-shard-00-00.aak8klr.mongodb.net:27017,ac-ex7rby6-shard-00-01.aak8klr.mongodb.net:27017,ac-ex7rby6-shard-00-02.aak8klr.mongodb.net:27017/?ssl=true&replicaSet=atlas-wz5auz-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(uri).then(async () => {
    const db = mongoose.connection.db;
    const reports = await db.collection('reports').find({messages: {$exists: true, $not: {$size: 0}}}).toArray();
    fs.writeFileSync('out.json', JSON.stringify(reports, null, 2), 'utf-8');
    process.exit(0);
}).catch(console.error);
