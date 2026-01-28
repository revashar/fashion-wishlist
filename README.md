# Fashion Wishlist

## Project Availability
https://final-project-revashar.onrender.com

## Overview

Fashion Wishlist is a web application that allows users to curate their dream wardrobe by saving clothing items from their favorite fashion brands. Users can create accounts, select their favorite brands, and build a wishlist of clothing items by entering product details — such as the item name, category, color, size, and a direct link to the brand’s website.

Each brand has its own dedicated page showing all wishlist items users have added from that brand. Users can explore these community wishlists, “heart” their favorite items, and use filters by color, category, or season to find inspiration or track trends. The app helps fashion enthusiasts keep their favorite styles organized while discovering new pieces from others’ wishlists.

Users can also view store locations of their favorited brands via connection to the Google Maps API. 

## Data Model

The application will store Users, Brands, and Wishlist Items.

* Users can have multiple favorite Brands (via references).

* Users can have multiple Wishlist Items (via references).

* Each Brand can be linked to multiple Wishlist Items added by different users.

* Each Wishlist Item stores its details directly, including name, category, color, size, link, and optional tags (by embedding these fields).

* Wishlist Items can also store a count of community hearts, representing how many users have favorited that item.

* Tags (color, category, season) allow filtering of items when viewing a brand page or personal wishlist.


An Example User:

```javascript
{
  _id: ObjectId("..."),
  username: "username",
  email: "user@example.com",
  passwordHash: "hashedpassword123",
  favoriteBrands: [ ObjectId("..."), ObjectId("...") ],
  createdAt: //timestamp
}
```

An Example Brand:

```javascript
{
  _id: ObjectId("..."),
  name: "Aritzia",
  website: "https://www.aritzia.com",
  description: "Canadian fashion retailer known for minimalist designs.",
  createdAt: //timestamp
}
```

An Example Wishlist Item:

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  brandId: ObjectId("..."),
  name: "Effortless Pants",
  category: "Bottoms",
  color: "Black",
  size: "S",
  link: "https://www.aritzia.com/en/product/effortless-pant/98321.html",
  season: ["Spring", "Summer"],
  likes: 24,
  createdAt: //timestamp
}
```

