const express = require('express');
const bodyParser= require('body-parser'); //data from client
const mongoose = require("mongoose");
const ejs = require("ejs");
const encrypt = require("mongoose-encryption")
const app=express();
var code=0;
require('dotenv').config();
app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}));
mongoose.connect("mongodb://localhost:27017/secretDB",{useNewUrlParser: true, 
useUnifiedTopology: true
}, () => { 
console.log('connected to database myDb ;)') 
});

const userSchema =new mongoose.Schema({
    email: String,
    password:String 
})
var secret = process.env.SOME_LONG_UNGUESSABLE_STRING;
userSchema.plugin(encrypt,{secret:secret, encryptedFields: ['password']});

const Cred = mongoose.model("Cred", userSchema)


app.get('/',function(req,res){
    res.render('home');
});
app.get('/login',function(req,res){
    res.render('login',{flag:code});
});
app.get('/register',function(req,res){
    res.render('register',{flag:code});

});
app.post('/register',function(req,res){
    Cred.findOne({email: req.body.username}, function(err, foundOne){
        if(!err){
            if(foundOne){
                code=1;
                //Redirect to login page and inform the creds are already in use.
                res.render("register",{flag:code})
                code=0;
            }else{
                const newcred= new Cred({
                    email: req.body.username,
                    password:req.body.password
                }) 
                newcred.save(function(err){
                    if(err){
                        console.log("Error in saving new creds: ",err)
                    }
                })
                res.render("secrets")
            }
        }else{
            console.log("Error in finding one user with same creds: ",err)
        }
    })
    
})

app.post('/login', function(req, res){
    const user = req.body.username
    const password=req.body.password
    Cred.findOne({email: user}, function(err, foundone){
        if(!err){
            if(foundone){
                if(foundone.password==password){
                    res.render("secrets")
                }else{
                    code=2
                    res.render("login",{flag:code})
                    code=0;
                }
            }else{
                code=3
                res.render("login",{flag:code})
                code=0;
            }
        }else{
            console.log("Couldnt save",err)
        }
    })
})

app.listen(3000, function(){
    console.log('Started');
});
 
