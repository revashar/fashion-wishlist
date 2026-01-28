import mongoose from 'mongoose';
import mongooseSlugPlugin from 'mongoose-slug-plugin';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String },
  favoriteBrands: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  createdAt: { type: Date, default: Date.now },
});

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  link: { type: String, required: true },
  imageUrl: { type: String }, // potentially?????
  category: { type: String, required: true }, // e.g. 'tops', 'shoes'
  color: [{ type: String }],
  size: { type: String },
  season: [{ type: String }], // e.g. 'spring', 'fall'
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  likes: { type: Number, default: 0 },
  tags: [{ type: String }], // e.g. ['casual', 'summer', 'trendy']
  createdAt: { type: Date, default: Date.now },
});

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  website: { type: String },
  logoUrl: { type: String },
  description: { type: String },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  createdAt: { type: Date, default: Date.now },
});

export const Item = mongoose.model('Item', itemSchema);
export const Brand = mongoose.model('Brand', brandSchema);
export const User = mongoose.model('User', userSchema);
