const asyncHandler = (requestHandler) =>{
    return (req,res,next) => {  // function of function i.e ()=>{()=>{}} === ()=>()=>{}
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err)) // This is promise syntax
    }
}

export { asyncHandler }

// This try - catch

// const asyncHandler = (fn) => async () => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message 
//         })
//     }
// }

// export {asyncHandler}