const express = require('express');
const bodyParser= require('body-parser'); //data from client
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require('express-session') 
const passport = require('passport')     //gives cookies for login and deletes when logged out
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const app=express();
require('dotenv').config();

var code=0;
app.set('view engine', 'ejs')
app.use(express.static("public"))
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret:"Our little secret",
    resave:false,
    saveUninitialized:false
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secretDB",{useNewUrlParser: true, useUnifiedTopology: true}, () => { 
console.log('connected to database myDb ;)') 
});

const userSchema =new mongoose.Schema({
    email: String,
    password:String,
    googleId: String,
    secret: Array
})
//var secret = process.env.SOME_LONG_UNGUESSABLE_STRING;
//userSchema.plugin(encrypt,{secret:secret, encryptedFields: ['password']});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)
const Cred = mongoose.model("Cred", userSchema)

passport.use(Cred.createStrategy());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",scope: ['profile', 'email']},
    //userProfileURL :"https://www.googleapis.com/oauth2/v3/userinfo",
  function(accessToken, refreshToken, profile, done) {
    Cred.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.get('/',function(req,res){
    res.render('home');
});
app.get("/auth/google",
  passport.authenticate('google',{ scope: ["profile"] }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/auth/google/secrets");
  });

app.get('/login',function(req,res){
    res.render('login',{flag:code});
});
app.get("/auth/google/secrets",
  passport.authenticate('google',{ failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get('/register',function(req,res){
    res.render('register',{flag:code});

});
app.get('/secrets',function(req,res){
  Cred.find({"secret":{$ne: null}}, function(err, foundusers){
    if(err){console.log(err)}else{
      if(foundusers){
        res.render("secrets", {user: foundusers})
      }else{
        res.render("secrets", {user: []})
      }
    }
  })
});
app.get('/logout', function(req,res){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      })
})
app.get('/submit', function(req,res){
  if(req.isAuthenticated()){
    res.render('submit');
}else{
    res.redirect('/login')
}
})

app.post('/register',function(req,res){
    Cred.register({username:req.body.username}, req.body.password, function(err, user) {
        if (err){
             console.log(err)
             code=4; 
             res.render('register',{flag:code})
             code=0;
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect('/secrets')
            })
            }
      });
  
})

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.post('/submit', function(req,res){
  const sec = req.body.secret
  Cred.findById(req.user._id, function(err, found){
    if(!err){
      if(found){
        found.secret.push(sec)
        found.save()
        res.redirect('/secrets')
      }
    }else{
      console.log(err)
      res.redirect('/submit')
    }
  })
})

app.listen(3000, function(){
    console.log('Started at port 3000');
});
 
