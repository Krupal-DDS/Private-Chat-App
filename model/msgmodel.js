const mongoose = require('mongoose');

const msgSchema = mongoose.Schema({
    userToken:{
        type: String,
        required: true        
    },
    messages:[{
        from: {
            type: String,
            required: true
        },
        to:{
            type: String,
            required: true,
        },
        message:{
            type: String,
            required: true
        },
        time:{
            type: String,
            required: true
        }
    }] 
})

module.exports = mongoose.model('PvtMsg',msgSchema);