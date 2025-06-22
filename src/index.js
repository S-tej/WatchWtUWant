// require('dotenv').config({path:'./env'}) // Can use this but this will look wierd for the usage
import connectDB from "./db/index.js"
import dotenv from "dotenv"
import {app} from "./app.js"

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("Error :",error)
        throw error
    })
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`MongoDB connected sucessfully on port ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log("MongoDB connection failed ! the error is : ",error)
})






/*
import express from "express";
const app = express();
(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("Error :",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on ${process.env.PORT}`);
        })
    }
    catch(error){
        console.error("Error :",error);
        throw error
    }
})()
*/