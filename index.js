const { error } = require('console');
const { Socket } = require('engine.io');
const express = require ('express');    
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http').createServer(app)
const PvtMsg = require('./model/msgmodel')

const io = require('socket.io')(http)

//middleware
app.use(express.static(__dirname + '/public'))
app.use(express.json());
app.use(express.urlencoded({extended : true}))
app.use(cors());

app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/index.html');
})

//POST THE USER
const {v4 :uuidv4} = require('uuid');
const { response } = require('express');
app.post('/new',(req,res)=>{
    let data = {
        username : req.body.username,
        userId: uuidv4()
    }    
    res.send(data); 
})

mongoose.connect('mongodb://localhost:27017/Wishchat-Private',{useNewUrlParser:true},(error)=>{
    if(error){
        console.log(error.message);
    }else{
        console.log('connect to database');
    }
})


//socket and middleware
io.use((socket,next)=>{
    const username = socket.handshake.auth.username; 
    const userId = socket.handshake.auth.userId;
    if(!username){
        return next(new Error('Invalid UserName'));
    }
    //create New session
    socket.username = username,
    socket.id = userId
    next();
})


//Global Methods
const method = {
    getToken:(sender,receiver)=>{           
        let key = [sender,receiver].sort().join("_");
        return key;
    },
    fetchMsgs: async (sender,receiver)=>{
        let token = method.getToken(sender,receiver);                     
        const findToken = await PvtMsg.findOne({userToken : token});
        if(findToken) {
            io.to(sender).emit('OldMsgs',{messages: findToken.messages});
        }else{
            let data = {
                userToken : token,
                messages: []
            }
            const saveToken = new PvtMsg(data);
            const createToken = await saveToken.save();
            if(!createToken){
                console.log("Token is not created");
            }else{
                console.log("Token is created successfully");
            }
        }
    },
    saveMsgs: async(payload)=>{
        let token = method.getToken(payload.senderId,payload.receiverId);            
        let data = {
            from : payload.senderId,
            to:payload.receiverId,
            message: payload.message,
            time: payload.time
        }                   
        PvtMsg.findOneAndUpdate({userToken: token},
            {$push: {messages: data}},(error,response)=>{
                if(error){
                    throw error;
                }else{
                    console.log('Messages saved');
                }
            })                            
    }
}


//GET ALL USERS
let users = [];
io.on('connection',async(socket)=>{
    let userData = {
    username : socket.username,
    userId : socket.id
    }
    users.push(userData);
    io.emit('users',{users});

    //Disconnect event
    socket.on('disconnect',() =>{
        users = users.filter(user => user.userId != socket.id);
        io.emit('users',{users});
    })

    //Get Message from clientc
    socket.on('messageToserver',payload =>{        
        io.to(payload.receiverId).emit('messageTouser',payload);
        method.saveMsgs(payload);       
    })

    //fetch Old Messages
    socket.on('fetchMsg',({receiver})=>{               
        method.fetchMsgs(socket.id,receiver);       
    })
})

http.listen(8002,()=>{
    console.log('connect to server');
})

