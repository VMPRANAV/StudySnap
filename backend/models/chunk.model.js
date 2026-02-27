const mongoose= require ('mongoose');
const ChunkSchema= new mongoose.Schema({
    fileId:{type:String, required :true},
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
    text:{type:String,required:true},
    embedding :{type:[Number],required:true},

});
module.exports=mongoose.model('Chunk',ChunkSchema);