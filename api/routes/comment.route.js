import express from "express";
const router=express.Router();
import { verifyToken } from "../util/verifyUser.js"
import { createComment,getPostComments,likeComment,editComment } from "../controllers/comment.controller.js";

router.post('/create',verifyToken,createComment);
router.get('/getPostComments/:postId',getPostComments);
router.put('/likeComment/:commentId',verifyToken,likeComment);
router.put('/editComment/:commentId',verifyToken,editComment);
export default router;