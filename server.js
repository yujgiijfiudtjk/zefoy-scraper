const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Zefoy Web Scraper Server is running!',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: {
      scrapeHome: `GET /api/scrape-home`,
      scrapeServices: `GET /api/scrape-services`,
      scrapeLinks: `GET /api/scrape-links`,
      scrapeMeta: `GET /api/scrape-meta`,
      customScrape: `POST /api/scrape-custom`
    }
  });
});

// Scrape Zefoy home page
app.get('/api/scrape-home', async (req, res) => {
  try {
    const response = await axios.get('https://zefoy.com', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract key data
    const title = $('title').text() || 'Not found';
    const mainHeading = $('h1').first().text() || 'Not found';
    const description = $('meta[name="description"]').attr('content') || 'Not found';
    
    res.json({
      status: 'success',
      url: 'https://zefoy.com',
      data: {
        title,
        mainHeading,
        description
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      error: error.code
    });
  }
});

// Scrape all visible text and services
app.get('/api/scrape-services', async (req, res) => {
  try {
    const response = await axios.get('https://zefoy.com', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract services/buttons
    const services = [];
    $('button, .service, [data-service], .btn-service').each((i, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr('href') || 'N/A';
      const dataAttr = $(elem).attr('data-service') || 'N/A';
      
      if (text) {
        services.push({
          name: text,
          href,
          dataAttribute: dataAttr
        });
      }
    });

    // Remove duplicates
    const uniqueServices = Array.from(new Map(services.map(s => [s.name, s])).values());

    res.json({
      status: 'success',
      url: 'https://zefoy.com',
      totalServices: uniqueServices.length,
      services: uniqueServices
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Scrape all links
app.get('/api/scrape-links', async (req, res) => {
  try {
    const response = await axios.get('https://zefoy.com', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    const links = [];
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      
      if (href) {
        links.push({
          text: text || 'No text',
          url: href
        });
      }
    });

    // Remove duplicate links
    const uniqueLinks = Array.from(new Map(links.map(l => [l.url, l])).values());

    res.json({
      status: 'success',
      url: 'https://zefoy.com',
      totalLinks: uniqueLinks.length,
      links: uniqueLinks
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Scrape metadata
app.get('/api/scrape-meta', async (req, res) => {
  try {
    const response = await axios.get('https://zefoy.com', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    const metadata = {
      title: $('title').text() || 'Not found',
      description: $('meta[name="description"]').attr('content') || 'Not found',
      keywords: $('meta[name="keywords"]').attr('content') || 'Not found',
      author: $('meta[name="author"]').attr('content') || 'Not found',
      viewport: $('meta[name="viewport"]').attr('content') || 'Not found',
      charset: $('meta[charset]').attr('charset') || 'Not found',
      ogTitle: $('meta[property="og:title"]').attr('content') || null,
      ogDescription: $('meta[property="og:description"]').attr('content') || null,
      ogImage: $('meta[property="og:image"]').attr('content') || null,
      twitterCard: $('meta[name="twitter:card"]').attr('content') || null
    };

    res.json({
      status: 'success',
      url: 'https://zefoy.com',
      metadata
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Custom scraping with CSS selectors
app.post('/api/scrape-custom', async (req, res) => {
  try {
    const { selectors } = req.body;

    if (!selectors || typeof selectors !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Selectors object is required',
        example: {
          selectors: {
            'title': 'h1',
            'buttons': 'button',
            'links': 'a'
          }
        }
      });
    }

    const response = await axios.get('https://zefoy.com', {
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
          const href = $(element).attr('href');
          
          if (text) {
            data[key].push({
              text,
              href: href || null
            });
          }
        });
      } else {
        data[key] = null;
      }
    }

    res.json({
      status: 'success',
      url: 'https://zefoy.com',
      data
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Scrape full page HTML
app.get('/api/scrape-html', async (req, res) => {
  try {
    const response = await axios.get('https://zefoy.com', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    res.json({
      status: 'success',
      url: 'https://zefoy.com',
      htmlLength: response.data.length,
      html: response.data
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/scrape-home',
      'GET /api/scrape-services',
      'GET /api/scrape-links',
      'GET /api/scrape-meta',
      'GET /api/scrape-html',
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
  console.log(`✅ Server is running on PORT ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`📍 Zefoy Scraper Ready!`);
});

module.exports = app;
