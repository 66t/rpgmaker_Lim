/*:
 * @target MZ
 * @plugindesc HTML/CSS 기반 3D 주사위 굴리기 애니메이션 및 변수 저장 플러그인입니다.
 * @author limpid
 *
 * @help
 * ============================================================================
 * 플러그인 개요
 * ============================================================================
 * 이 플러그인은 HTML과 CSS 3D 변환을 사용하여 화면 중앙에 주사위를 굴리는 
 * 시각적 애니메이션을 구현합니다. 주사위 굴림이 완료되면 3D 매트릭스 계산을 
 * 통해 윗면의 값을 감지하고, 해당 결과값을 지정된 게임 변수에 저장합니다.
 *
 * ============================================================================
 * 사용 주의사항 및 설정
 * ============================================================================
 * - 필요 이미지 자원: 
 * 프로젝트의 'img/' 폴더 내에 '骰子1.png' 부터 '骰子6.png' 파일이 
 * 반드시 존재해야 텍스처가 정상적으로 렌더링됩니다.
 *
 * - 스크립트 사용법:
 * 이벤트의 '스크립트' 커맨드에서 다음 코드를 실행하세요.
 * new Dice(변수ID);
 * (예: new Dice(10); -> 주사위 굴림 결과가 10번 변수에 저장됩니다)
 *
 * - 시스템 대기 처리:
 * 주사위가 화면에 굴러가는 동안 메시지 시스템이 대기 상태(Busy)가 되어, 
 * 결과가 도출될 때까지 다음 이벤트 실행이 자동으로 지연됩니다.
 */

var roll={is:false,index:0,num:0}
var rd=[]
var dice=[1,2,3,4,5,6]
function Dice(size) {
    this.initialize(...arguments);
}

Dice.prototype = Object.create(Sprite.prototype);
Dice.prototype.constructor = Dice;
Dice.prototype.initialize = function(index) {
    this.index=index

    this.num=roll.num++
    this.id=roll.index++
    const html = `<div style="position: fixed;z-index: 100;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%)">
  <div id="dice${this.id}" style="position:relative;width:35px;height:35px;transform-style:preserve-3d;">
    <div data-normal="0,0,1"  style="position:absolute;width:100%;height:100%;background-image: url('img/骰子${dice[0]}.png');display:flex;justify-content:center;align-items:center;transform:translateZ(17.5px)"></div>
    <div data-normal="0,1,0" style="position:absolute;width:100%;height:100%;background-image: url('img/骰子${dice[1]}.png');display:flex;justify-content:center;align-items:center;transform:rotateX(-90deg) translateZ(17.5px)"></div>
    <div data-normal="1,0,0" style="position:absolute;width:100%;height:100%;background-image: url('img/骰子${dice[2]}.png');display:flex;justify-content:center;align-items:center;transform:rotateY(90deg) translateZ(17.5px)"></div>
    <div data-normal="-1,0,0" style="position:absolute;width:100%;height:100%;background-image: url('img/骰子${dice[3]}.png');display:flex;justify-content:center;align-items:center;transform:rotateY(-90deg) translateZ(17.5px)"></div>
    <div data-normal="0,-1,0" style="position:absolute;width:100%;height:100%;background-image: url('img/骰子${dice[4]}.png');display:flex;justify-content:center;align-items:center;transform:rotateX(90deg) translateZ(17.5px)"></div>
    <div data-normal="0,0,-1" style="position:absolute;width:100%;height:100%;background-image: url('img/骰子${dice[5]}.png');display:flex;justify-content:center;align-items:center;transform:rotateX(180deg) translateZ(17.5px)"></div>
</div>`
    const container = document.createElement("div");
    this.div=container
    container.innerHTML = html;
    document.body.appendChild(container.firstElementChild);
    setTimeout(()=>{
        this.roll()
    },5)
};
Dice.prototype.roll = function() {
    const dice = document.getElementById('dice'+this.id);
    const targetRotations = {
        x: Math.floor(Math.random() * 4) * 90 + 7200,
        y: Math.floor(Math.random() * 4) * 90 + 7200,
        z: Math.floor(Math.random() * 4) * 90 + 7200
    };
    dice.style.transition = 'transform 2000ms cubic-bezier(0.4, 0.0, 0.2, 1), left 200ms cubic-bezier(0.4, 0.0, 0.2, 1)';

    dice.style.transform = `
      rotateX(${targetRotations.x}deg)
      rotateY(${targetRotations.y}deg)
      rotateZ(${targetRotations.z}deg)
    `;
    let x=(roll.num-1)*40
    dice.style.left=(80*this.num+x*-1)+'px'
    setTimeout(()=>{   this.handler()},2200)
}
Dice.prototype.handler = function() {
    const dice = document.getElementById('dice'+this.id);
    roll.num--
    const style = getComputedStyle(dice);
    const transform = style.transform;
    let matrix = [[1,0,0], [0,1,0], [0,0,1]];
    try {
        if (transform !== 'none') {
            const values = transform.match(/matrix3d\(([^)]+)/)[1].split(',').map(Number);
            matrix = [
                [values[0], values[4], values[8]],
                [values[1], values[5], values[9]],
                [values[2], values[6], values[10]]
            ];
        }
        const faces = document.querySelectorAll(`#dice${this.id} > div`);
        let maxZ = -Infinity, topFace;
        faces.forEach(face => {
            const normal = face.dataset.normal.split(',').map(Number);
            const tz = normal[0] * matrix[2][0] + normal[1] * matrix[2][1] + normal[2] * matrix[2][2];
            if (tz > maxZ) {
                maxZ = tz;
                topFace = face;
            }
        });
        let num = topFace.style.backgroundImage.match(/骰子(\d+)/)[1];
        $gameVariables.setValue(this.index,num)
    }
    catch (e){
        $gameVariables.setValue(this.index,1)
    }
}
Dice.prototype.remove = function (){
    if (this.div && this.div.parentElement) {
        this.div.parentElement.removeChild(this.div);
    } else {
        const diceElement = document.getElementById('dice' + this.id);
        if (diceElement) {
            diceElement.parentElement.removeChild(diceElement);
        }
    }
}

Game_Message.prototype.isBusy = function() {
    return (
        this.hasText() ||
        this.isChoice() ||
        this.isNumberInput() ||
        this.isItemChoice() ||
        roll.num
    );
};