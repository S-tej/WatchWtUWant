import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findOne(userId)
        const refreshToken = user.generateRefreshToken()
        const accessToken = user.generateAccessToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave : false })
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
    }
    
}

const registerUser = asyncHandler(async (req,res) => {
    // Get user details from frontend
    // validation such as not empty
    // check if the user is already existed : username,email
    // check for image,check for avatar
    // upload them to clodinary
    // create user object - create entry in  db
    // remove password and refresh token field from the response
    // check for user creation
    // return response

    const {fullName,email,username,password} = req.body
    // console.log("req.body : ",req.body)

    if([fullName,email,username,password].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    } 

    const existedUser = await User.findOne({
        $or : [{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409,"User with the same username or email already exists")
    }

    // console.log(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    } 

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"  // This will subtract them and this is syntax
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req,res) => {
    //1. Get User's Credentials (username, password, email).
    //2. Check if user exist or not.
    //3. If Exist, Check Credentials Validity.
    //4. Generate Access Token & Refresh Token.
    //5. Save Refresh Token in DB and Respond(Secure Cookies) it to User.
    //6. Give Access Token with the Response also(Refresh + Access), don't Save in DB.

    const {email,username,password} = req.body

    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"user doesn't exist")
    } 

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findOne(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in succesfully"
        )
    )
    
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedRefreshToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedRefreshToken?._id)
    
        if(!user){
             throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
        
        const {accessToken , newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken : accessToken,
                    refreshToken : newrefreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
 }