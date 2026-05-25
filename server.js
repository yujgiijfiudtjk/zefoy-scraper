const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ⬇️ Facebook URL
const TARGET_URL = 'https://www.facebook.com';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Facebook User Data Scraper Running',
    targetWebsite: TARGET_URL,
    endpoints: {
      scrapeProfile: 'GET /api/scrape-profile?username=USERNAME',
      scrapeUserInfo: 'GET /api/scrape-user-info?username=USERNAME',
      scrapeUserPosts: 'GET /api/scrape-user-posts?username=USERNAME',
      scrapeUserFriends: 'GET /api/scrape-user-friends?username=USERNAME',
      extractUserData: 'POST /api/extract-user-data',
      customScrape: 'POST /api/scrape-custom'
    }
  });
});

// Scrape user profile
app.get('/api/scrape-profile', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: 'error',
        message: 'Username parameter required',
        example: '/api/scrape-profile?username=facebook'
      });
    }

    const url = `${TARGET_URL}/${username}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': TARGET_URL
      }
    });

    const $ = cheerio.load(response.data);

    // Extract user profile information
    const profileData = {
      username: username,
      profileTitle: $('title').text() || 'Not found',
      profileDescription: $('meta[name="description"]').attr('content') || 'Not found',
      profileImage: $('img[alt*=profile]').attr('src') || null,
      profileName: $('h1').text() || 'Not found',
      bio: $('[data-testid="user-bio"]').text() || null,
      followerCount: $('[data-testid="follower"]').text() || null
    };

    res.json({
      status: 'success',
      url: url,
      data: profileData
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to scrape profile',
      error: error.message,
      note: 'Facebook may have blocked the request. Try using /api/extract-user-data instead.'
    });
  }
});

// Scrape detailed user information
app.get('/api/scrape-user-info', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: 'error',
        message: 'Username parameter required'
      });
    }

    const url = `${TARGET_URL}/${username}/about`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const $ = cheerio.load(response.data);

    const userInfo = {
      username: username,
      email: $('[data-testid="contact-info-email"]').text() || 'Not found',
      phone: $('[data-testid="contact-info-phone"]').text() || 'Not found',
      location: $('[data-testid="location"]').text() || 'Not found',
      workPlace: $('[data-testid="workplace"]').text() || 'Not found',
      education: $('[data-testid="education"]').text() || 'Not found',
      birthday: $('[data-testid="birthday"]').text() || 'Not found',
      relationship: $('[data-testid="relationship"]').text() || 'Not found',
      website: $('a[data-testid="website"]').attr('href') || null
    };

    res.json({
      status: 'success',
      url: url,
      data: userInfo
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to scrape user info',
      error: error.message
    });
  }
});

// Scrape user posts
app.get('/api/scrape-user-posts', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: 'error',
        message: 'Username parameter required'
      });
    }

    const url = `${TARGET_URL}/${username}/posts`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    const posts = [];
    $('[data-testid="post"]').each((i, elem) => {
      const postText = $(elem).find('[data-testid="post-text"]').text().trim();
      const postTime = $(elem).find('time').text().trim();
      const likes = $(elem).find('[aria-label*="like"]').text().trim();
      const comments = $(elem).find('[aria-label*="comment"]').text().trim();

      if (postText) {
        posts.push({
          text: postText,
          time: postTime || 'N/A',
          likes: likes || '0',
          comments: comments || '0'
        });
      }
    });

    res.json({
      status: 'success',
      url: url,
      username: username,
      totalPosts: posts.length,
      posts: posts
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to scrape posts',
      error: error.message
    });
  }
});

// Scrape user friends
app.get('/api/scrape-user-friends', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: 'error',
        message: 'Username parameter required'
      });
    }

    const url = `${TARGET_URL}/${username}/friends`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    const friends = [];
    $('[data-testid="friend-item"]').each((i, elem) => {
      const friendName = $(elem).find('[data-testid="name"]').text().trim();
      const friendUrl = $(elem).find('a').attr('href');
      const friendImage = $(elem).find('img').attr('src');

      if (friendName) {
        friends.push({
          name: friendName,
          url: friendUrl || null,
          image: friendImage || null
        });
      }
    });

    res.json({
      status: 'success',
      url: url,
      username: username,
      totalFriends: friends.length,
      friends: friends
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to scrape friends',
      error: error.message
    });
  }
});

// Extract user data with custom selectors
app.post('/api/extract-user-data', async (req, res) => {
  try {
    const { username, dataToExtract } = req.body;

    if (!username) {
      return res.status(400).json({
        status: 'error',
        message: 'Username is required',
        example: {
          username: 'facebook',
          dataToExtract: ['name', 'bio', 'follower_count', 'email']
        }
      });
    }

    const url = `${TARGET_URL}/${username}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract specific user data
    const extractedData = {
      username: username,
      extractedFields: {}
    };

    if (!dataToExtract || dataToExtract.length === 0) {
      // Extract all common fields
      extractedData.extractedFields = {
        name: $('h1').text() || null,
        bio: $('[data-testid="user-bio"]').text() || null,
        email: $('[data-testid="email"]').text() || null,
        phone: $('[data-testid="phone"]').text() || null,
        location: $('[data-testid="location"]').text() || null,
        profileImage: $('img[alt*="profile"]').attr('src') || null,
        coverImage: $('img[alt*="cover"]').attr('src') || null,
        followerCount: $('[aria-label*="follower"]').text() || null,
        followingCount: $('[aria-label*="following"]').text() || null
      };
    } else {
      // Extract specific fields
      dataToExtract.forEach(field => {
        switch(field) {
          case 'name':
            extractedData.extractedFields.name = $('h1').text() || null;
            break;
          case 'bio':
            extractedData.extractedFields.bio = $('[data-testid="user-bio"]').text() || null;
            break;
          case 'email':
            extractedData.extractedFields.email = $('[data-testid="email"]').text() || null;
            break;
          case 'phone':
            extractedData.extractedFields.phone = $('[data-testid="phone"]').text() || null;
            break;
          case 'location':
            extractedData.extractedFields.location = $('[data-testid="location"]').text() || null;
            break;
          case 'profile_image':
            extractedData.extractedFields.profile_image = $('img[alt*="profile"]').attr('src') || null;
            break;
          case 'cover_image':
            extractedData.extractedFields.cover_image = $('img[alt*="cover"]').attr('src') || null;
            break;
          case 'follower_count':
            extractedData.extractedFields.follower_count = $('[aria-label*="follower"]').text() || null;
            break;
          case 'following_count':
            extractedData.extractedFields.following_count = $('[aria-label*="following"]').text() || null;
            break;
        }
      });
    }

    res.json({
      status: 'success',
      url: url,
      data: extractedData
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to extract user data',
      error: error.message,
      note: 'Facebook may be blocking scraping. Consider using an API instead.'
    });
  }
});

// Custom scrape with CSS selectors
app.post('/api/scrape-custom', async (req, res) => {
  try {
    const { username, selectors } = req.body;

    if (!username) {
      return res.status(400).json({
        status: 'error',
        message: 'Username is required'
      });
    }

    if (!selectors || typeof selectors !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Selectors object is required',
        example: {
          username: 'facebook',
          selectors: {
            name: 'h1',
            bio: '[data-testid="user-bio"]',
            friends: 'a[href*="/friends"]'
          }
        }
      });
    }

    const url = `${TARGET_URL}/${username}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const data = {};

    for (const [key, selector] of Object.entries(selectors)) {
      const elements = $(selector);
      
      if (elements.length === 1) {
        data[key] = elements.text().trim();
      } else if (elements.length > 1) {
        data[key] = [];
        elements.each((index, element) => {
          const text = $(element).text().trim();
          if (text) data[key].push(text);
        });
      } else {
        data[key] = null;
      }
    }

    res.json({
      status: 'success',
      url: url,
      username: username,
      data: data
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to scrape custom data',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/scrape-profile?username=USERNAME',
      'GET /api/scrape-user-info?username=USERNAME',
      'GET /api/scrape-user-posts?username=USERNAME',
      'GET /api/scrape-user-friends?username=USERNAME',
      'POST /api/extract-user-data',
      'POST /api/scrape-custom'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Facebook Scraper Server running on PORT ${PORT}`);
  console.log(`📍 Target: ${TARGET_URL}`);
});

module.exports = app;
