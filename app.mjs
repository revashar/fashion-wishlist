import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import './config.mjs'; 
import { Brand, Item, User } from './db.mjs';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import axios from 'axios';
import * as cheerio from 'cheerio';
const { ObjectId } = mongoose.Types;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import Handlebars from 'handlebars';
import puppeteer from "puppeteer";
import fs from "fs";
import { URL } from 'url';
import dotenv from "dotenv";
dotenv.config();

const itemCard = fs.readFileSync(path.join(__dirname, 'views', 'partials', 'item-card.hbs'), 'utf8');
Handlebars.registerPartial('item-card', itemCard);

const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/opt/render/.cache/puppeteer/chrome/linux-142.0.7444.162/chrome-linux64/chrome";

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.DSN }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day session
}));

app.use(async (req, res, next) => {
  if (req.session.userId) {
    res.locals.user = await User.findById(req.session.userId).lean();
  } else {
    res.locals.user = null;
  }
  next();
});

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'layout', // Automatically use views/layout.hbs
  layoutsDir: path.join(__dirname, 'views'), // layout.hbs will be in /views
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    eq: (a, b) => a === b
  } 
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

Handlebars.registerHelper('range', function(start, end) {
  let arr = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }
  return arr;
});

// Helper for comparing two values (used for selecting filter options)
Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("includes", function(array, value) {
  if (!array) return false;
  return array.map(String).includes(String(value));
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { title: "Welcome to the Fashion Wishlist App" });
});

app.get('/brands', async (req, res) => {
  try {
    const brands = await Brand.find().lean();

    // Count items for each brand using Item collection
    const brandCounts = await Promise.all(
      brands.map(async (brand) => {
        const count = await Item.countDocuments({ brandId: brand._id });
        return { ...brand, itemCount: count };
      })
    );

    res.render('brands', { title: "Brands", brands: brandCounts });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to fetch brands' });
  }
});

app.get('/wishlist', async (req, res) => {
  try {
    const users = await User.find().populate('wishlist').lean();
    res.render('wishlist', { title: "Wishlists", users });
  } catch (err) {
    res.status(500).render('error', { message: 'Failed to fetch wishlist' });
  }
});

app.get('/add-item', async (req, res) => {
  try {
    const brands = await Brand.find().lean();

    //const previousData = req.session.formData || {};
    //delete req.session.formData; // clear it after using

    res.render('add-item', { 
      title: "Add a New Item", 
      brands,
      //previousData // pass to template
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load brands' });
  }
});


app.post('/add-item', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login'); // ensure user is logged in
  }

  try {
    let brandId;

    // Handle brand selection
    if (req.body.brandSelect === 'other') {
      const manualBrandName = req.body.brandManual?.trim();
      if (!manualBrandName) {
        return res.status(400).render('error', { message: 'Brand name is required when "Other" is selected.' });
      }
      const newBrand = new Brand({ name: manualBrandName });
      const savedBrand = await newBrand.save();
      brandId = savedBrand._id;
    } else {
      brandId = req.body.brandSelect;
    }

    // Ensure multi-select checkboxes are arrays
    const seasons = req.body.season
      ? Array.isArray(req.body.season)
        ? req.body.season
        : [req.body.season]
      : [];

    const colors = req.body.color
      ? Array.isArray(req.body.color)
        ? req.body.color
        : [req.body.color]
      : [];

    // Create new item
    const newItem = new Item({
      name: req.body.name,
      category: req.body.category,
      color: colors,
      size: req.body.size,
      link: req.body.link,
      brandId,
      userId: req.session.userId,
      season: seasons,
    });

    const savedItem = await newItem.save();

    // Add to user's wishlist
    await User.findByIdAndUpdate(req.session.userId, { $push: { wishlist: savedItem._id } });

    res.redirect('/your-wishlist');
  } catch (err) {
    console.error('Error saving item:', err);
    res.status(500).render('error', { message: 'Failed to add item' });
  }
});

app.get('/items', async (req, res) => {
  try {
    let items = await Item.find().populate('brandId').lean();

    // Collect filter options
    const allColors = [...new Set(items.flatMap(i => i.color || []))].sort();
    const allCategories = [...new Set(items.map(i => i.category))].sort();
    const allSeasons = [...new Set(items.flatMap(i => i.season || []))].sort();
    const allBrands = [...new Set(items.map(i => i.brandId?.name).filter(Boolean))].sort();

    const { color, category, season, brand } = req.query;

    // Apply filters
    if (color) items = items.filter(i => i.color.includes(color));
    if (category) items = items.filter(i => i.category === category);
    if (season) items = items.filter(i => i.season.includes(season));
    if (brand) items = items.filter(i => i.brandId?.name === brand);

    // ⭐ ADD IMAGES HERE ⭐
    const itemsWithImages = await Promise.all(
      items.map(async i => ({
        ...i,
        image: await getProductImage(i.link)
      }))
    );

    res.render('items', {
      title: 'All Items',
      items: itemsWithImages,
      filters: { color, category, season, brand },
      options: { allColors, allCategories, allSeasons, allBrands },
      user: req.session.userId ? { _id: req.session.userId } : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load items' });
  }
});

app.post("/items/:id/wishlist", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const user = await User.findById(req.session.userId);
    const itemId = req.params.id;

    const already = user.wishlist.includes(itemId);

    if (!already) {
      user.wishlist.push(itemId);
      await user.save();
    }

    res.json({ success: true, already });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/wishlist/add/:itemId', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ status: "error" });

  const { itemId } = req.params;
  try {
    const user = await User.findById(req.session.userId);

    if (user.wishlist.includes(itemId)) {
      return res.json({ status: "already" });
    }

    user.wishlist.push(itemId);
    await user.save();
    return res.json({ status: "added" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error" });
  }
});

// specific Brand Page ---

app.get('/brands/:brandId', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId).lean();
    if (!brand) return res.status(404).render('error', { message: 'Brand not found' });

    let items = await Item.find({ brandId: brand._id }).lean();

    // Get unique options for filters
    const allColors = [...new Set(items.flatMap(item => item.color || []))].sort();
    const allCategories = [...new Set(items.map(item => item.category))].sort();
    const allSeasons = [...new Set(items.flatMap(item => item.season || []))].sort();
    const allUsers = [...new Set(items.map(item => item.userId?.username).filter(Boolean))].sort();

    // Apply filters from query params
    const { color, category, season, user } = req.query;
    if (color) items = items.filter(item => item.color.includes(color));
    if (category) items = items.filter(item => item.category === category);
    if (season) items = items.filter(item => item.season.includes(season));
    if (user) items = items.filter(item => item.userId?.username === user);

    // Add images
    const itemsWithImages = await Promise.all(
      items.map(async item => ({ ...item, image: await getProductImage(item.link) }))
    );

    res.render('brand-view', {
      title: `${brand.name}`,
      brand,
      items: itemsWithImages,
      filters: { color, category, season, user },
      options: { allColors, allCategories, allSeasons, allUsers },
      currentUser: req.session.userId
    });

  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load brand page' });
  }
});

// GET registration form
app.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// POST registration
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).render('error', { message: 'Username already taken' });
    }
    const newUser = new User({ username, email, password }); // ideally hash password in production
    await newUser.save();
    req.session.userId = newUser._id;
    res.redirect('/your-wishlist');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to register' });
  }
});

// GET login form
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// POST login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(400).render('error', { message: 'Invalid credentials' });
    }
    req.session.userId = user._id;
    res.redirect('/your-wishlist');
  } catch (err) {
    console.error('Login error:', err); // <-- add this
    res.status(500).render('error', { message: 'Failed to login' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ------- get image -------

// Original function
export async function getSimpleImage(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Try Open Graph first
    let imgSrc = $('meta[property="og:image"]').attr('content');

    // Fallback to first jpg/png image on the page (skip SVG)
    if (!imgSrc) {
      imgSrc = $('img')
        .toArray()
        .map(img => $(img).attr('src'))
        .find(src => src && /\.(jpe?g|png|gif)$/i.test(src));
    }

    // Make relative URLs absolute
    if (imgSrc && !imgSrc.startsWith('http')) {
      const urlObj = new URL(url);
      imgSrc = urlObj.origin + imgSrc;
    }

    return imgSrc || null;
  } catch (err) {
    console.error('Simple image fetch error for', url, err.message);
    return null;
  }
}


/**
 * New: fetch product gallery image (e-commerce product images) using headers
 * and fallback to Microlink if blocked
 */
export async function getProductGalleryImage(url) {
  try {
    // Step 1: Try fetching page normally with browser headers
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
      },
    });

    const $ = cheerio.load(html);

    const imgs = $('img')
      .toArray()
      .map(img => $(img))
      .filter($img => {
        const className = $img.attr('class') || '';
        const dataShot = $img.attr('data-shottype') || '';
        const dataQaid = $img.attr('data-qaid') || '';
        return /product/i.test(className) || dataShot || /pdpProductGallery/i.test(dataQaid);
      });

    if (imgs.length) {
      // Pick largest src from srcset first
      for (const $img of imgs) {
        const srcset = $img.attr('srcset');
        if (srcset) {
          const urlFromSrcset = getLargestSrcFromSrcset(srcset);
          if (urlFromSrcset) return makeAbsolute(urlFromSrcset, url);
        }
      }
      // fallback to src
      return makeAbsolute(imgs[0].attr('src'), url);
    }

    // Step 2: If blocked or no product images, fallback to Microlink API
    const ml = await getImageViaMicrolink(url);
    if (ml) return ml;

    return null;
  } catch (err) {
    console.error('Product gallery fetch error for', url, err.message);
    // Microlink fallback if initial request failed
    const ml = await getImageViaMicrolink(url);
    return ml;
  }
}

async function getImageViaMicrolink(url) {
  try {
    const res = await axios.get('https://api.microlink.io', {
      params: { url }
    });

    // Log the full response for debugging
    console.log('Microlink response for', url, JSON.stringify(res.data, null, 2));

    const imageUrl = res.data?.data?.image?.url || null;

    if (!imageUrl) {
      console.warn('Microlink did not return an image for', url);
    }

    return imageUrl;
  } catch (err) {
    console.error('Microlink fetch error for', url);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }
    return null;
  }
}


export async function getProductImage(url) {
  const simple = await getSimpleImage(url);
  if (simple) return simple;

  const product = await getProductGalleryImage(url);
  if (product) return product;

  const microlink = await getImageViaMicrolink(url);
  if (microlink) return microlink;

  // If all fail, return null
  return null;
}


/**
 * Helper: pick largest URL from srcset
 */
function getLargestSrcFromSrcset(srcset) {
  if (!srcset) return null;
  const candidates = srcset.split(',').map(part => {
    const [url, width] = part.trim().split(/\s+/);
    return { url, width: parseInt(width) || 0 };
  });
  candidates.sort((a, b) => b.width - a.width);
  return candidates[0]?.url || null;
}

/**
 * Helper: make relative URL absolute
 */
function makeAbsolute(src, baseUrl) {
  if (!src) return null;
  if (!src.startsWith('http')) {
    try {
      const urlObj = new URL(baseUrl);
      src = src.startsWith('/')
        ? urlObj.origin + src
        : urlObj.origin + urlObj.pathname.replace(/\/[^\/]*$/, '/') + src;
    } catch (e) {
      return src;
    }
  }
  return src;
}


// --- /your-wishlist ---
app.get('/your-wishlist', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  try {
    const user = await User.findById(req.session.userId)
      .populate({ path: 'wishlist', populate: { path: 'brandId' } })
      .lean();

    const wishlist = user.wishlist || [];

    // Extract unique filter options
    const options = {
      allColors: [...new Set(wishlist.flatMap(item => item.color || []))].sort(),
      allCategories: [...new Set(wishlist.map(item => item.category || ""))].sort(),
      allSeasons: [...new Set(wishlist.flatMap(item => item.season || []))].sort(),
      allBrands: [...new Set(wishlist.map(item => item.brandId?.name).filter(Boolean))].sort()
    };

    // Add images (optional)
    const wishlistWithImages = await Promise.all(
      wishlist.map(async item => ({
        ...item,
        image: await getProductImage(item.link)
      }))
    );

    res.render('your-wishlist', {
      title: `${user.username}'s Wishlist`,
      wishlist: wishlistWithImages,
      filters: {},        // No filters applied by default
      options,
      currentUser: user   // optional, for showing "Add Item" link, etc.
    });

  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load your wishlist' });
  }
});


// --- /user-wishlist/:userId ---
app.get('/user-wishlist/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate({ path: 'wishlist', populate: { path: 'brandId' } })
      .lean();

    if (!user) return res.status(404).render('error', { message: 'User not found' });

    let wishlist = user.wishlist || [];

    // Extract unique filter options
    const options = {
      allColors: [...new Set(wishlist.flatMap(item => item.color || []))].sort(),
      allCategories: [...new Set(wishlist.map(item => item.category || ""))].sort(),
      allSeasons: [...new Set(wishlist.flatMap(item => item.season || []))].sort(),
      allBrands: [...new Set(wishlist.map(item => item.brandId?.name).filter(Boolean))].sort()
    };

    // Apply filters from query parameters
    const { color, category, season, brand } = req.query;
    if (color) wishlist = wishlist.filter(item => (item.color || []).includes(color));
    if (category) wishlist = wishlist.filter(item => item.category === category);
    if (season) wishlist = wishlist.filter(item => (item.season || []).includes(season));
    if (brand) wishlist = wishlist.filter(item => item.brandId?.name === brand);

    const wishlistWithImages = await Promise.all(
      wishlist.map(async item => ({
        ...item,
        image: await getProductImage(item.link)
      }))
    );

    res.render('your-wishlist', {
      title: `${user.username}'s Wishlist`,
      wishlist: wishlistWithImages,
      filters: { color, category, season, brand },
      options,
      currentUser: null  // no "Add Item" for public users
    });

  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load wishlist' });
  }
});

// Public page listing all users with links to their wishlists
app.get('/wishlists', async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 }).lean(); // get all users, sorted alphabetically by username
    res.render('wishlists', { title: 'All Wishlists', users });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to fetch wishlists' });
  }
});

app.post('/delete-item/:itemId', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect('/login');

    // Remove the item from the user's wishlist
    user.wishlist.pull(req.params.itemId);
    await user.save();

    // code to remove the item from the Item collection
    //await Item.findByIdAndDelete(req.params.itemId);

    res.redirect(`/user-wishlist/${user._id}`);
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).render('error', { message: 'Failed to delete item' });
  }
});

//testing code
app.get("/puppeteer-test", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: CHROME_PATH,
      args: ["--no-sandbox"]
    });
    const page = await browser.newPage();
    await page.goto("https://example.com");
    await browser.close();
    res.send("Puppeteer is working!");
  } catch (err) {
    res.send("Puppeteer failed:\n" + err.toString());
  }
});

// STORE LOCATER CODEEEE
app.get("/store-locator", async (req, res) => {
  res.render("store-locator", { title: "Store Locator" });
});

app.post("/store-locator", async (req, res) => {
  const zip = req.body.zip;
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  try {
    // 1. Get all brand names from MongoDB
    let brands = await Brand.find({}, "name").lean();

    // 2. Remove placeholder brands
    const BLOCKED = ["example", "sample", "TestBrand"];
    brands = brands
      .map(b => b.name.trim())
      .filter(name => name && !BLOCKED.includes(name));

    if (brands.length === 0) {
      return res.render("store-locator", {
        title: "Store Locator",
        zip,
        error: "No valid brands found in the database."
      });
    }

    // 3. Convert ZIP to lat/lng using Google Geocoding API
    const geoURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${API_KEY}`;
    const geoRes = await axios.get(geoURL);

    if (!geoRes.data.results.length) {
      return res.render("store-locator", {
        title: "Store Locator",
        zip,
        error: "Invalid ZIP code."
      });
    }

    const { lat, lng } = geoRes.data.results[0].geometry.location;

    // 4. Find nearest store for each brand using Google Places API
    const results = [];

    for (const brand of brands) {
      const placesURL = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${encodeURIComponent(
        brand
      )}&location=${lat},${lng}&radius=50000&key=${API_KEY}`;

      const placeRes = await axios.get(placesURL);

      if (placeRes.data.results.length) {
        const store = placeRes.data.results[0];
        results.push({
          brand,
          address:
            store.vicinity ||
            store.formatted_address ||
            "Address not available"
        });
      } else {
        results.push({ brand, address: "No nearby store found" });
      }
    }

    // 5. Render results
    res.render("store-locator", {
      title: "Store Locator",
      zip,
      results
    });
  } catch (err) {
    console.error("Store locator error:", err);
    res.render("store-locator", {
      title: "Store Locator",
      zip,
      error: "Something went wrong."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

