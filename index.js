const express = require("express");
const app = express();

let bParser = require("body-parser");
let cors = require("cors");
app.use(bParser.raw({ type: "*/*" }));
app.use(cors());

let ln = 1;
let passwords = new Map();
let tokenMap = new Map();
let channels = new Map();
let listings = new Map();
let carts = new Map();
let pHistory = new Map();
let chatHistory = new Map();
let itemsToShip = new Map();
let reviews = new Map();
let soldListings = new Map();


// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

app.get("/sourcecode", (req, res) => {
  res.send(require('fs').readFileSync(__filename).toString())
})


app.post("/signup", (req, res) => {
  try {
    let parsed = JSON.parse(req.body);
  } catch (e) {
    res.send("Not a JSON formatted Body");
    return;
  }

  let parsed = JSON.parse(req.body);

  let success = { success: true };
  let failDupUser = { success: false, reason: "Username exists" };
  let failNoPass = { success: false, reason: "password field missing" };
  let failNoUser = { success: false, reason: "username field missing" };

  if (passwords.has(parsed.username)) {
    res.send(failDupUser);
    return;
  } else if (parsed.password == null) {
    res.send(failNoPass);
    return;
  } else if (parsed.username == null) {
    res.send(failNoUser);
    return;
  } else {
    passwords.set(parsed.username, parsed.password);
    res.send(success);
    return;
  }
});


app.post("/login", (req, res) => {
  try {
    let parsed = JSON.parse(req.body);
  } catch (e) {
    res.send("Not a JSON formatted Body");
    return;
  }

  let parsed = JSON.parse(req.body);

  let success = { success: true, token: "unique-token-" + Date.now() };
  let failNoUser = { success: false, reason: "User does not exist" };
  let failWrongPass = { success: false, reason: "Invalid password" };
  let failMissingPass = { success: false, reason: "password field missing" };
  let failMissingUser = { success: false, reason: "username field missing" };

  if (!parsed.password) {
    res.send(failMissingPass);
    return;
  }

  if (!parsed.username) {
    res.send(failMissingUser);
    return;
  }

  if (!passwords.has(parsed.username)) {
    res.send(failNoUser);
    return;
  }

  if (passwords.get(parsed.username) === parsed.password) {
    res.cookie("id", success.token);
    tokenMap.set(success.token, parsed.username);
    carts.set(success.token, []);
    chatHistory.set(parsed.username, []);
    res.send(success);
    return;
  } else if (passwords.get(parsed.username) !== parsed.password) {
    res.send(failWrongPass);
    return;
  }
});


app.post("/change-password", (req, res) => {
  
  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send("Not a JSON formatted Body");
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }

  if (passwords.get(user) !== parsed.oldPassword) {
    res.send({ "success":false,"reason":"Unable to authenticate" });
    return;
  } else {
    passwords.set(user, parsed.newPassword);
    res.send({"success":true});
    return;
  }
});
        
app.post("/create-listing", (req, res) => {

  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send("Not a JSON formatted Body");
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }
  
  if (!parsed.price) {
    res.send({"success":false,"reason":"price field missing"});
    return;
  }
  
  if (!parsed.description) {
    res.send({"success":false,"reason":"description field missing"});
    return;
  }
  
  let listingId = "listing_" + ln;
  ln = ln + 1;
  
  listings.set(listingId, { "price": parsed.price, "description":parsed.description, "itemId": listingId, "sellerUsername":user});
  res.send({"success":true,"listingId":listingId});
  return;
});

app.get("/listing", (req, res)=> {

  let parsed;

  try {
    parsed = req.query.listingId;
  } catch (e) {
    res.send("No query parameter");
    return;
  }

  if (!listings.has(parsed)) {
    res.send({ success: false, reason: "Invalid listing id"});
    return;
  }
  
  let obj = listings.get(parsed);
  
  res.send({"success":true,"listing":obj});
  return;
  
})


app.post("/modify-listing", (req, res) => {

  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send("Not a JSON formatted Body");
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }
    
  if (!parsed.itemid) {
    res.send({"success":false,"reason":"itemid field missing"});
    return;
  }
  
  let lng = listings.get(parsed.itemid);
  
  if (tokenMap.get(token) === lng.sellerUsername) {
    if (parsed.price) {
      lng.price = parsed.price;
    }

    if (parsed.description) {
      lng.description = parsed.description;
    }
    
    res.send({"success":true});
    return;
  }
  
});


app.post("/add-to-cart", (req, res) => {

  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send("Not a JSON formatted Body");
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }
    
  if (!parsed.itemid) {
    res.send({"success":false,"reason":"itemid field missing"});
    return;
  }
  
  if (listings.has(parsed.itemid)) {
    let c = carts.get(token);
    c.push(listings.get(parsed.itemid));
    res.send({"success":true})
  } else {
    res.send({"success":false,"reason":"Item not found"});
  }
  
  
});

app.get("/cart", (req, res) => {

  let token;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }
  
  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } 

  let c = carts.get(token);
  
  res.send({"success": true, "cart": c});
  
  return;
  
});


app.post("/checkout", (req, res) => {

  let token;
  
  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }
  
  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } 

  
  let c = carts.get(token);
    
  if (c.length === 0) {
    res.send({"success":false,"reason":"Empty cart"});
    return;
  } else {
    let i = 0;
    for (i = 0; i < c.length; i++) {
      let obj = c[i];
      if (!listings.has(obj.itemId)) {
        res.send({"success":false,"reason":"Item in cart no longer available"});
        return;
      }
    }

    if (!pHistory.has(token)) {
      pHistory.set(token, []);
    }

    i = 0;
    let ph = pHistory.get(token);
    
    for (i = 0; i < c.length; i++) {
      ph.push(c[i]);
      
      if (!soldListings.has(c[i].sellerUsername)) {
        soldListings.set(c[i].sellerUsername, []);
      } 
      
      let arr = soldListings.get(c[i].sellerUsername);
      arr.push(c[i].itemId);
      soldListings.set(c[i].sellerUsername, arr);
    
      listings.delete(c[i].itemId);
      itemsToShip.set(c[i].itemId, {"owner": c[i].sellerUsername, "shipped": false});
    }
    
    carts.set(token, []);
    res.send({"success":true});
    return;
  }
  
});

app.get("/purchase-history", (req, res) => {

  let token;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }
  
  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } 

  let ph = pHistory.get(token);
  
  res.send({"success": true, "purchased": ph});
  return;
  
});


app.post("/chat", (req, res) => {

  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }
  
  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send({"success":false,"reason":"contents field missing"});
    return;
  }
    
  if (!parsed.destination) {
    res.send({"success":false,"reason":"destination field missing"});
    return;
  }
  
  if (!parsed.contents) {
    res.send({"success":false,"reason":"contents field missing"});
    return;
  }
  
  if (!passwords.get(parsed.destination)) {
    res.send({"success":false,"reason":"Destination user does not exist"});
    return;
  }
  
  //console.log("from: " + tokenMap.get(token));
  //console.log("to: " + parsed.destination);
  //console.log("contents: " + parsed.contents);
  
  let chat = chatHistory.get(tokenMap.get(token));
  let chat2 = chatHistory.get(parsed.destination);
  
  let chatMsg = {"from":tokenMap.get(token), "to": parsed.destination, "contents": parsed.contents};
    
  chat.push(chatMsg);
  chat2.push(chatMsg);
  
  res.send({"success":true});
  return;
  
});


app.post("/chat-messages", (req, res) => {

  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ "success":false,"reason":"Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }
  
  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send({"success":false,"reason":"contents field missing"});
    return;
  }
    
  if (!parsed.destination) {
    res.send({"success":false,"reason":"destination field missing"});
    return;
  }
  
  if (!passwords.get(parsed.destination)) {
    res.send({"success":false,"reason":"Destination user not found"});
    return;
  }
  
  user = tokenMap.get(token);
  let dest = parsed.destination;
  
  let chH = chatHistory.get(user);
  let newChat = [];
  let i = 0;
  
  for (i = 0; i < chH.length; i++) {
    let msg = chH[i];
    if (msg.from === user) {
      let newMsg = {"from":user, "contents":msg.contents};
      newChat.push(newMsg);
    } else if (msg.to === user) {
      let newMsg = {"from": dest, "contents":msg.contents};
      newChat.push(newMsg);
    }
  }
  
  res.send({"success":true,"messages":newChat})
  return;  
});



app.post("/ship", (req, res) => {
  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ success: false, reason: "Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }

  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send({ success: false, reason: "contents field missing" });
    return;
  }

  if (!itemsToShip.has(parsed.itemid)) {
    res.send({ success: false, reason: "Item was not sold" });
    return;
  }

  // itemsToShip.set(c[i].itemId, {"owner": c[i].sellerUsername, "shipped": false});

  if (itemsToShip.has(parsed.itemid)) {
    let item = itemsToShip.get(parsed.itemid);

    if (item.owner !== tokenMap.get(token)) {
      res.send({ success: false, reason: "User is not selling that item" });
      return;
    } else if (item.shipped) {
      res.send({ success: false, reason: "Item has already shipped" });
      return;
    } else {
      itemsToShip.set(parsed.itemid, {
        owner: tokenMap.get(token),
        shipped: true
      });
      res.send({ success: true });
      return;
    }
  }
});


app.get("/status", (req, res)=> {

  let parsed;

  try {
    parsed = req.query.itemid;
  } catch (e) {
    res.send("No query parameter");
    return;
  }
  
  if (!itemsToShip.has(parsed)) {
    res.send({"success":false,"reason":"Item not sold"});
    return;
  }
  
  let item = itemsToShip.get(parsed);
  
  if (item.shipped) {
    res.send({"success":true,"status":"shipped"});
    return;
  } else {
    res.send({"success":true,"status":"not-shipped"});
    return;
  }
  
});


app.post("/review-seller", (req, res) => {
  
  let token;
  let parsed;
  let user;

  try {
    token = req.headers.token;
  } catch (e) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (token === undefined) {
    res.send({ success: false, reason: "token field missing" });
    return;
  }

  if (!tokenMap.get(token)) {
    res.send({ success: false, reason: "Invalid token" });
    return;
  } else {
    user = tokenMap.get(token);
  }

  try {
    parsed = JSON.parse(req.body);
  } catch (e) {
    res.send({ success: false, reason: "contents field missing" });
    return;
  }
  
  
  let ph = pHistory.get(token);
  let confirmPurchase = false;
  let i = 0; 
  
  for (i=0;i<ph.length;i++) {
    if (ph[i].itemId === parsed.itemid) {
      confirmPurchase = true;
    }
  }
  
  if (!confirmPurchase) {
    res.send({"success":false,"reason":"User has not purchased this item"});
    return;
  }
  
  if (reviews.has(parsed.itemid)) {
    res.send({"success":false,"reason":"This transaction was already reviewed"});
    return;
  }
  
  reviews.set(parsed.itemid, {"numStars":parsed.numStars,"contents":parsed.contents, "itemid":parsed.itemid, "from":tokenMap.get(token)})
  res.send({"success":true});
  return;
  
});


app.get("/reviews", (req, res)=> {

  let parsed;

  try {
    parsed = req.query.sellerUsername;
  } catch (e) {
    res.send("No query parameter");
    return;
  }
    
  let arr = soldListings.get(parsed);
  let reviewsMsg = [];
    
  let i = 0;
  
  for (i = 0; i < arr.length; i++) {
    if (reviews.has(arr[i])) {
      let rev = reviews.get(arr[i]);
      let msg = {"from": rev.from, "numStars":rev.numStars, "contents":rev.contents};
      reviewsMsg.push(msg);
    }
  }
    
  res.send({"success":true,"reviews":reviewsMsg});
  
});


app.get("/selling", (req, res)=> {

  let parsed;

  try {
    parsed = req.query.sellerUsername;
  } catch (e) {
    res.send({"success":false,"reason":"sellerUsername field missing"});
    return;
  }
  
  if (!parsed) {
    res.send({"success":false,"reason":"sellerUsername field missing"});
    return;
  }
  
  //listings.set(listingId, { "price": parsed.price, "description":parsed.description, "itemId": listingId, "sellerUsername":user});
  
  let arr = [];
  
  for (let [key, value] of listings) {
    if (value.sellerUsername === parsed) {
      arr.push({"price":value.price, "description": value.description, "sellerUsername": value.sellerUsername, "itemId": value.itemId});
    }
  }
  
  res.send({"success":true,"selling":arr});
  return;
});