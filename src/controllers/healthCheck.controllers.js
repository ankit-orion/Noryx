import {ApiResponse} from "../utils/apiResponse.js";

const healthCheck = (req, res) =>{
    try{
        res.status(200).json(
            new ApiResponse(200, {message: "Server is running fine!"})
        )
    }catch(error){

    }
}

export {healthCheck};