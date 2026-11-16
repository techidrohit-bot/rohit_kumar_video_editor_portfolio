const { MongoClient } = require('mongodb');
const fs = require('fs');

const uri = process.env.MONGODB_URI || 'mongodb+srv://portfoliowebsite:rohit1234@cluster0.gpbzoyc.mongodb.net/rohitportfolio?retryWrites=true&w=majority';

// 1. Initial 16 videos from CSV
const baseVideos = [
  { id: '1', type: 'long', title: 'Podcast hook', youtubeId: '1Yj80vtI97Q', description: 'Podcast hook edit' },
  { id: '2', type: 'long', title: 'Audi edit', youtubeId: '9j_b0VbPDOY', description: 'Commercial car edit' },
  { id: '3', type: 'long', title: 'Observenow', youtubeId: 'Yg5PuOR4Alk', description: 'Event edit' },
  { id: '4', type: 'long', title: 'Sample video', youtubeId: 'SgQohJ0Lqfw', description: 'Corporate video' },
  { id: '5', type: 'long', title: 'Project 5', youtubeId: 'zcr-xLVKU8I', description: 'Storytelling video' },
  { id: '6', type: 'long', title: 'Project 6', youtubeId: 'HLtdvIg_wWo', description: 'Commercial video' },
  { id: '7', type: 'long', title: 'Project 7', youtubeId: 'cxMQMqzvALY', description: 'Creative edit' },
  { id: '8', type: 'short', title: 'Show up honestly', youtubeId: '45CQ2tHeBYY', description: 'Vertical reel' },
  { id: '9', type: 'short', title: 'Motion graphics', youtubeId: 'lqhDXJiUbBA', description: 'Motion graphics reel' },
  { id: '10', type: 'short', title: 'AI Mic ads', youtubeId: 'XO8-QAc_mxE', description: 'Product ad' },
  { id: '11', type: 'short', title: 'The tatva', youtubeId: '3N0wOA7ffSM', description: 'Narrative short' },
  { id: '12', type: 'short', title: 'Map Animation', youtubeId: 'Wcsalzd5y78', description: 'Map animation short' },
  { id: '13', type: 'short', title: 'Task video', youtubeId: 'ySm_Cj2iLVs', description: 'Lifestyle reel' },
  { id: '14', type: 'short', title: 'Reel Edit 7', youtubeId: 'zsQVjWfUidI', description: 'Social media short' },
  { id: '15', type: 'short', title: 'Reel Edit 8', youtubeId: 'v5VNUACuJw4', description: 'Social media short' },
  { id: '16', type: 'short', title: 'Reel Edit 9', youtubeId: '_wq3_6-r3Og', description: 'Social media short' }
];

// 2. The 8 new shorts from Rohit
const newShorts = [
  { id: '17', type: 'short', title: '2 pages Ads', youtubeId: 'zAHZRhQhi6c', description: '2 pages Ads short' },
  { id: '18', type: 'short', title: 'TGIC SHIRT', youtubeId: 'RO5HClxyHgY', description: 'TGIC Shirt short' },
  { id: '19', type: 'short', title: 'Dream street', youtubeId: 'gDWMMEbf8A0', description: 'Dream street short' },
  { id: '20', type: 'short', title: '2 pages', youtubeId: 'eAZ0KAGA_gM', description: '2 pages reel' },
  { id: '21', type: 'short', title: 'The CAC Destroyer', youtubeId: 'xNUtZgSD_Kc', description: 'The CAC Destroyer short' },
  { id: '22', type: 'short', title: 'Tata Technologies', youtubeId: 'fjP0aZFDfEs', description: 'Tata Technologies short' },
  { id: '23', type: 'short', title: 'ultrawellness', youtubeId: 'kAeV1nGfB0k', description: 'ultrawellness short' },
  { id: '24', type: 'short', title: 'Podcast shorts', youtubeId: 'wpKkEknJOUg', description: 'Podcast shorts' }
];

const allVideos = [...baseVideos, ...newShorts];

// Assign position index per category
let longIdx = 1;
let shortIdx = 1;
const prepared = allVideos.map(v => {
  const pos = v.type === 'long' ? longIdx++ : shortIdx++;
  return {
    id: v.id,
    type: v.type,
    title: v.title,
    youtubeId: v.youtubeId,
    description: v.description,
    position: pos,
    createdAt: new Date().toISOString()
  };
});

async function populateDB() {
  console.log(`Connecting to MongoDB to populate ${prepared.length} videos...`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db('rohitportfolio');
    const col = db.collection('videos');

    // Clear existing collection and insert all 24 videos
    await col.deleteMany({});
    const res = await col.insertMany(prepared);
    console.log(`SUCCESS! Inserted ${res.insertedCount} videos into MongoDB collection 'videos'.`);

    // Verify count
    const count = await col.countDocuments();
    console.log(`Total videos now in MongoDB: ${count}`);
    const sample = await col.find({}).project({ title: 1, type: 1, youtubeId: 1, position: 1 }).toArray();
    console.log('Sample from DB:', sample.slice(0, 5));
  } catch (err) {
    console.error('Error populating MongoDB:', err);
  } finally {
    await client.close();
  }
}

populateDB();
