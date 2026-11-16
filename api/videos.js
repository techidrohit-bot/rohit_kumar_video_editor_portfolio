const { connectToDatabase } = require('../lib/mongodb');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('videos');

    // ── GET: Read all videos sorted by position ───────────
    if (req.method === 'GET') {
      const items = await collection
        .find({})
        .sort({ position: 1, createdAt: 1 })
        .toArray();

      // Clean documents (omit Mongo internal _id)
      const videos = items.map(({ _id, ...rest }) => rest);
      return res.status(200).json({ success: true, videos });
    }

    // ── POST: Create or Update single video ───────────────
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, type, title, youtubeId, description, position } = body || {};

      if (!title || !youtubeId) {
        return res.status(400).json({ success: false, error: 'Title and YouTube ID are required' });
      }

      const videoId = id || (Math.random().toString(36).slice(2) + Date.now().toString(36));
      const videoType = (type || 'long').toLowerCase();

      // Get count of existing items to determine position
      const count = await collection.countDocuments({ type: videoType });
      const targetPos = (position && parseInt(position, 10) >= 1) ? parseInt(position, 10) : count + 1;

      const doc = {
        id: videoId,
        type: videoType,
        title: title.trim(),
        youtubeId: youtubeId.trim(),
        description: (description || '').trim(),
        position: targetPos,
        updatedAt: new Date().toISOString()
      };

      const existing = await collection.findOne({ id: videoId });
      if (existing) {
        await collection.updateOne({ id: videoId }, { $set: doc });
      } else {
        doc.createdAt = new Date().toISOString();
        await collection.insertOne(doc);
      }

      return res.status(200).json({ success: true, video: doc });
    }

    // ── PUT: Bulk update / Reorder / Reset ────────────────
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { videos, action } = body || {};

      if (!Array.isArray(videos)) {
        return res.status(400).json({ success: false, error: 'videos array is required' });
      }

      // Replace collection contents with given array
      await collection.deleteMany({});
      if (videos.length > 0) {
        const cleaned = videos.map((v, idx) => ({
          id: v.id || ('v_' + idx + '_' + Date.now()),
          type: (v.type || 'long').toLowerCase(),
          title: v.title || 'Untitled',
          youtubeId: v.youtubeId || '',
          description: v.description || '',
          position: idx + 1,
          createdAt: v.createdAt || new Date().toISOString()
        }));
        await collection.insertMany(cleaned);
      }

      return res.status(200).json({ success: true, count: videos.length });
    }

    // ── DELETE: Delete video by id or Delete All ──────────
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' && req.body ? JSON.parse(req.body) : (req.body || {});
      const id = req.query.id || body.id;
      const isAll = req.query.all === 'true' || body.all === true;

      if (isAll) {
        await collection.deleteMany({});
        return res.status(200).json({ success: true, message: 'All videos deleted' });
      }

      if (!id) {
        return res.status(400).json({ success: false, error: 'Video id is required' });
      }

      await collection.deleteOne({ id });
      return res.status(200).json({ success: true, message: 'Video deleted' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
