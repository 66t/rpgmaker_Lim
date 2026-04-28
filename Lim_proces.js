/*:
 * @target MZ
 * @plugindesc 数据管理
 * @author Limpid
 * -----------------------------------------------------------------------------
 * @help
 * 这是【数据管理】系统的基类
 * 用于处理【场景地图】中的额外功能
 * 
 * 插件指令 
 * #添加自定义属性
 * 
 * 脚本指令
 * 得到自定义属性
 *  LIM.getProcess()
 *  -args1:key
 * 
 * 本脚本只于本工程，禁止修改挪用于其他项目。
 * 
 * @command set
 * @text 添加自定义属性
 * @desc 
 *
 * @arg key
 * @type String
 * @text 属性名
 * @desc
 * 
 * @arg val
 * @type String
 * @text 值
 * @desc
 */
var LIM = LIM || {};
LIM.PRO={}

PluginManager.registerCommand("Lim_proces", "set", args => {
    if(!args.key||!args.val) return
    if(args.key=="dazz") LIM.PRO[args.key]=args.val==1
    else LIM.PRO[args.key]=args.val
});
LIM.getProcess=function (key){return LIM.evePro[key]||""}

//追加额外信息为存档内容
LIM.process_DMM=DataManager.makeSaveContents
DataManager.makeSaveContents = function() {
    const contents= LIM.process_DMM.call(this)
    contents.pro = LIM.PRO
    return contents;
};
LIM.process_DME=DataManager.extractSaveContents
DataManager.extractSaveContents = function(contents) {
    LIM.process_DME.call(this,contents)
    LIM.PRO = contents.pro
};
///////////////////////////////////////////
//地图绑定处理器
LIM.process_GMS = Game_Map.prototype.setupEvents
Game_Map.prototype.setupEvents=function(){
    if(LIM.process) delete LIM.process
    LIM.EVEisChar={}
    LIM.process=new Lim_Process()
    LIM.process_GMS.call(this)
    $gamePlayer.builtData =LIM.PRO
    LIM.process.eve[0]=$gamePlayer
}
LIM.process_GMU = Game_Map.prototype.update
Game_Map.prototype.update = function(sceneActive) {
    LIM.process_GMU.call(this,sceneActive)
    LIM.process.update()
};
LIM.process_GEU=Game_Event.prototype.update
Game_CharacterBase.prototype.initialize = function() {
    this.builtData ={}
    this.initMembers();
};

//装填数据
LIM.process_GESP=Game_Event.prototype.setupPageSettings
Game_Event.prototype.setupPageSettings=function(){
    LIM.process_GESP.call(this)
    this.annProcessing()
    this.builtData =LIM.process.data[this._eventId]
    LIM.process.eve[this._eventId]=this
    
};
Game_Event.prototype.annProcessing=function() {
    LIM.process.data[this._eventId]={name:$dataMap.events[this._eventId].name}
    let data=this.page().list.filter((value,index,a)=>{return value.code===108;})
    let ann=[]
    for(let i=0;i<data.length;i++)
        for(let j=0;j<data[i].parameters.length;j++)
        {
            let s=data[i].parameters[j]
            if(s.length>2&&s.substring(0,2)==="=>")ann.push(s.substring(2,s.length))
        }
    for(let i=0;i<ann.length;i++){
        let s1=ann[i].split("|")
        for(let j=0;j<s1.length;j++)
        {
            let s2=s1[j].split("#")
            if(s2.length>1) {
                for(let k=1;k<s2.length;k++){
                    let v = s2[k].split(":")
                    if (v.length > 1) LIM.process.data[this._eventId][s2[0]+(v[0].length?"_":"")+v[0]] = v[1]
                }
            }
            else {
                let v = s1[j].split(":")
                if (v.length > 1) LIM.process.data[this._eventId][v[0]] = v[1]
            }
        }
    }
    let pro=LIM.process.data[this._eventId]
    if(pro.moves) this.setMoveSpeed(pro.moves)
    if(pro.movef) this.setMoveFrequency(pro.movef)
}
////////////////////////
//属性管理器
function Lim_Process() {this.initialize.apply(this, arguments);}
Lim_Process.prototype = Object.create(Lim_Process.prototype);
Lim_Process.prototype.constructor = Lim_Process;
Lim_Process.prototype.initialize = function () {
    //属性
    this.data=[LIM.PRO]
    //事件
    this.eve=[]
    this.time=0
}
Lim_Process.prototype.update = function () {
    this.time++
}




