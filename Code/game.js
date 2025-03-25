let p1_tip = 1000;
let p2_tip = 1000;
let exchangeNum = 0;
let acceptNum = 1;
let P1AllMoney = 0;
let P2AllMoney = 0;


const DB_NAME = "GameDB";
const STORE_NAME = "GameStore";

let p1_hand = []; let p2_hand = [];
let p1_selected_card = []; let p2_selected_card = [];

let time = "game";
let turn = "p1";
let numTurn = 1;
let acceptTurn = 10;

const elementToNumber = {"H": 1, "He": 2, "Li": 3, "Be": 4, "B": 5, "C": 6, "N": 7, "O": 8, "F": 9, "Ne": 10,"Na": 11, "Mg": 12, "Al": 13, "Si": 14, "P": 15, "S": 16, "Cl": 17, "Ar": 18, "K": 19, "Ca": 20,"Fe": 26, "Cu": 29, "Zn": 30, "I": 53};
const elements = [...Array(6).fill('H'), ...Array(4).fill('O'), ...Array(4).fill('C'),'He', 'Li', 'Be', 'B', 'N', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca','Fe', 'Cu', 'Zn', 'I'];
const element = ['H','O','C','He', 'Li', 'Be', 'B', 'N', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca','Fe', 'Cu', 'Zn', 'I'];
let materials = [];
let imageCache = {};

let amountMoney = 50;


//preprocesses
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = (event) => reject("DB open error");
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}
async function setItem(key, value) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    return tx.complete;
}
async function getItem(key) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Get error");
    });
}
async function preloadImages() {
    let imageNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 26, 29, 30, 53];
    for (let num of imageNumbers) {
        try {
            const imageUrl = `../images/${num}.webp`;
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to load image: ${num}`);
            const blob = await response.blob();
            if (!blob) throw new Error(`Blob is null for image ${num}`);
            imageCache[num] = blob;
        } catch (error) {
            console.error(`Image loading error: ${num}`, error);
        }
    }
}
async function loadMaterials(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.material || !Array.isArray(data.material)) {
            document.getElementById("Attention").style.display = "inline";
            return [];
        }
        document.getElementById("Attention").style.display = "none";
        return data.material;
    } catch (error) {
        console.error("Error fetching compounds:", error);  // Log the error to the console for debugging
        document.getElementById("Attention").style.display = "inline";
        return []; // Return an empty array in case of error
    }
}



async function updateTips() {
    document.getElementById("p1_tip").innerHTML = `現在のチップ：${p1_tip}`;
    document.getElementById("p2_tip").innerHTML = `現在のチップ：${p2_tip}`;
    document.getElementById("p1_area").style.display = "inline";
    document.getElementById("p2_area").style.display = "inline";
    turn = turn=="p1" ? "p2":"p1";
    if (turn === "p2") {
        if (P1AllMoney === 0 && P2AllMoney === 0) {
            actionType1();
        } else if (P1AllMoney > P2AllMoney) {
            actionType2();
        } else {
            actionType3();
        }
    } else {
        ["bet_button", "call_button", "raise_button", "fold_button", "check_button"].forEach(id => document.getElementById(id).style.display = "none");
    }
    if (exchangeNum != 0) {
        document.getElementById("bet_button").style.display = "none";
    }
}



async function showDoneButton() {
    document.getElementById("raise_button").style.display = "none";
    document.getElementById("call_button").style.display = "none";
    document.getElementById("bet_button").style.display = "none";
    document.getElementById("fold_button").style.display = "none";
    document.getElementById("check_button").style.display = "none";
    showDownHandsP1();
    document.getElementById("done_button").style.display = "inline";
    document.getElementById("p2_explain").innerHTML = "化合物を精製してください";
}


//when Press buttons
function PressBetButton(who) {
    if (who=="p1") {
        P1AllMoney += amountMoney;
        p1_tip -= amountMoney;
        document.getElementById("p1_explain").innerHTML = `${amountMoney}チップ ベットしました`;
        if (turn === "p2") actionType2();
        updateTips();
    } else if (who=="p2" && turn=="p2" && time=="game" && p2_tip>=amountMoney){
        P2AllMoney += amountMoney;
        p2_tip -= amountMoney;
        document.getElementById("p2_explain").innerHTML = `${amountMoney}チップ ベットしました`;
        updateTips();
        if (turn === "p1") actionType2();
        autoAction("p1");
    }
}
function PressCallButton(who) {
    if (who=="p1") {
        p1_tip -= P2AllMoney - P1AllMoney;
        document.getElementById("p1_explain").innerHTML = `${P2AllMoney - P1AllMoney}チップ コールしました`;
        P1AllMoney += P2AllMoney - P1AllMoney;
        updateTips();
    } else if (who=="p2" && turn=="p2" && time=="game" && p2_tip>=amountMoney){
        p2_tip -= P1AllMoney - P2AllMoney;
        document.getElementById("p2_explain").innerHTML = `${P1AllMoney - P2AllMoney}チップ コールしました`;
        P2AllMoney += P1AllMoney - P2AllMoney;
        updateTips();
        autoAction("p1");
    };
}
function PressRaiseButton(who) {
    if (who=="p1") {
        P1AllMoney += amountMoney*2;
        p1_tip -= amountMoney*2;
        document.getElementById("p1_explain").innerHTML = `${amountMoney*2}チップ レイズしました`;
        updateTips();
    } else if (who=="p2" && turn=="p2" && time=="game" && p2_tip>=amountMoney*2){
        P2AllMoney += amountMoney*2;
        p2_tip -= amountMoney*2;
        document.getElementById("p2_explain").innerHTML = `${amountMoney*2}チップ レイズしました`;
        updateTips();
        autoAction("p1");
    };
}
function PressCheckButton(who) {
    if (who=="p1") {
        document.getElementById("p1_explain").innerHTML = `チェックしました`;
        updateTips();
    } else if (who=="p2" && turn=="p2" && time=="game"){
        document.getElementById("p2_explain").innerHTML = `チェックしました`;
        updateTips();
        autoAction("p1");
    };
    if (P1AllMoney == P2AllMoney && P1AllMoney!=0) {
        time="exchange";
        document.getElementById("p2_explain").innerHTML = "交換するカードをタップしてください";
        ["bet_button", "call_button", "raise_button", "fold_button", "check_button"].forEach(id => document.getElementById(id).style.display = "none");
    }
}
function PressFoldButton(who) {
    if (who=="p1") {
        p1_tip -= P1AllMoney==0 ? 50:P1AllMoney;
        p2_tip += P1AllMoney==0 ? 50:P1AllMoney;
        document.getElementById("p1_explain").innerHTML = `フォールドしました`;
        showDownHandsP1();
        ["bet_button", "call_button", "raise_button", "fold_button", "check_button"].forEach(id => document.getElementById(id).style.display = "none");
    } else if (who=="p2" && turn=="p2"){
        p2_tip -= P2AllMoney==0 ? 50:P2AllMoney;
        p1_tip += P2AllMoney==0 ? 50:P2AllMoney;
        document.getElementById("p2_explain").innerHTML = `フォールドしました`;
        showDownHandsP1();
        ["bet_button", "call_button", "raise_button", "fold_button", "check_button"].forEach(id => document.getElementById(id).style.display = "none");
    };
    const nextButton = document.getElementById("nextButton");
    nextButton.style.display = "inline";
    numTurn += 1;
    if (numTurn<=acceptTurn) {
        nextButton.innerHTML = "次のゲームへ";
        nextButton.addEventListener("click", function() {
            resetGame();
            this.style.display = "none";
        })
    } else {
        nextButton.innerHTML = "ラウンド終了";
        nextButton.addEventListener("click", function() {
            returnScreen();
            numTurn = 1;
            setItem("p2_tip");
            this.style.display = "none";
        })
    }
}


//show buttons
function actionType1() {
    document.getElementById("bet_button").style.display = "inline";
    document.getElementById("fold_button").style.display = "inline";
    document.getElementById("raise_button").style.display = "none";
    document.getElementById("check_button").style.display = "none";
    document.getElementById("call_button").style.display = "none";
}
function actionType2() {
    document.getElementById("call_button").style.display = "inline";
    document.getElementById("fold_button").style.display = "inline";
    document.getElementById("raise_button").style.display = "inline";
    document.getElementById("check_button").style.display = "none";
    document.getElementById("bet_button").style.display = "none";
}
function actionType3() {
    document.getElementById("raise_button").style.display = "inline";
    document.getElementById("fold_button").style.display = "inline";
    document.getElementById("call_button").style.display = "none";
    document.getElementById("check_button").style.display = "none";
    document.getElementById("bet_button").style.display = "none";
    if (P1AllMoney != P2AllMoney) {document.getElementById("call_button").style.display="inline";} else {document.getElementById("check_button").style.display="inline"}
}


//when finished game
async function showDownHandsP1() {
    const showArea = document.getElementById("p1_hand");
    showArea.innerHTML = "";
    p1_hand.forEach((elem, index) => {
        const blob = imageCache[elementToNumber[elem]];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = elem;
        image.id = index;
        image.style.border = "1px solid black";
        image.style.padding = "5px";
        showArea.appendChild(image);
    })
}

//Show both hand when game
async function showHandsP2() {
    const showArea = document.getElementById("p2_hand");
    p2_hand.forEach((elem, index) => {
        const blob = imageCache[elementToNumber[elem]];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = elem;
        image.id = index;
        image.style.border = "1px solid black";
        image.style.padding = "5px";
        image.classList.add("selected");
        image.classList.toggle("selected");
        image.addEventListener("click", function() {
            if (time=="exchange" && exchangeNum<=acceptNum-1 && turn=="p2"){
                exchangeNum += 1;
                let newElement = elements[Math.floor(Math.random()*elements.length)];
                p2_hand[this.id] = newElement;
                this.alt = newElement;
                const newBlob = imageCache[elementToNumber[newElement]];
                this.src = URL.createObjectURL(newBlob);
                turn = turn=="p1" ? "p2":"p1";
            }
            if (time=="make") {
                this.classList.toggle("selected");
                if (this.classList.contains("selected")){p2_selected_card.push(this.alt);} else {p2_selected_card.splice(p2_selected_card.indexOf(this.alt),1);}
            }
            if (exchangeNum==acceptNum) {time = "make";exchangeNum+=1;showDoneButton();}
        })
        showArea.appendChild(image);
    })
}
async function showHandsP1() {
    const showArea = document.getElementById("p1_hand");
    p1_hand.forEach((elem, index) => {
        const blob = imageCache[0];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = "elem";
        image.id = index;
        image.style.border = "1px solid black";
        image.style.padding = "5px";
        showArea.appendChild(image);
    })
}


//Usually functions
async function searchMaterials(components) {
    return materials.filter(material => {
        for (const element in material.d) {
            if (!components[element] || material.d[element] > components[element]) {
                return false;
            };
        };
        return true;
    });
}
async function searchMaterial(components) {
    return materials.find(material => {
        for (const element in components) {
            if (!material.d[element] || material.d[element] !== components[element]) {
                return false;
            }
        }
        for (const element in material.d) {
            if (!components[element]) {
                return false;
            }
        }
        return true;
    }) || materials[0];
}
function arrayToObj(array) {
    let result = {}
    array.forEach(item => {
        if (result[item]) {
            result[item]++
        } else {
            result[item] = 1
        }
    })
    return result
}
async function randomHand() {
    for (let i = 0; i < 8; i++) {
        p1_hand.push(elements[Math.floor(Math.random()*elements.length)]);
        p2_hand.push(elements[Math.floor(Math.random()*elements.length)]);
    };
}
function objToArray(obj) {
    const result = [];
    for (const [key, count] of Object.entries(obj)) {
        for (let i = 0; i < count; i++) {
            result.push(key);
          }
    }
    return result;
}

//Press done_button
document.getElementById("done_button").addEventListener("click", async function() {
    createdMaterial = await searchMaterial(arrayToObj(p2_selected_card));
    document.getElementById("done_button").style.display = "none";
    document.getElementById("p2_explain").innerHTML = `作成：${createdMaterial.a}`;
    var creatableMaterials = await searchMaterials(arrayToObj(p1_hand));
    var createMaterial = creatableMaterials.sort((a,b) => b.c - a.c)[0];
    let needs =  objToArray(createMaterial.d);
    const cards = document.querySelectorAll("#p1_hand img");
    p1_hand.forEach((elem, index) => {
        if (needs.includes(elem)) {
            needs.splice(needs.indexOf(elem), 1);
            cards[index].classList.add("selected");
        }
    });   
    document.getElementById("p1_explain").innerHTML = `作成：${createMaterial.a}`;
    if (createMaterial.c > createdMaterial.c) {p1_tip+=P1AllMoney+P2AllMoney;} else if(createMaterial.c < createdMaterial.c) {p2_tip+=P1AllMoney+P2AllMoney;} else {p1_tip+=P1AllMoney;p2_tip+=P2AllMoney;};
    //updateTips();
    const nextButton = document.getElementById("nextButton");
    nextButton.style.display = "inline";
    numTurn += 1;
    if (numTurn<=acceptTurn) {
        nextButton.innerHTML = "次のゲームへ";
        nextButton.addEventListener("click", function() {
            resetGame();
            this.style.display = "none";
        })
    } else {
        nextButton.innerHTML = "ラウンド終了";
        nextButton.addEventListener("click", function() {
            returnScreen();
            numTurn = 1;
            setItem("p2_tip");
            this.style.display = "none";
        })
    }
})

//When start Game
document.getElementById("startButton").addEventListener("click", async function() {
    p2_tip = await getItem("p2_tip");
    p2_tip = p2_tip==undefined ? 1000 : p2_tip;
    turn = Math.random()>0.5 ? "p1":"p2";
    updateTips();
    if (turn=="p1") autoAction("p1");
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("gameRuleButton").style.display = "none";
    document.getElementById("centerLine").style.display = "block";
})

//When finished Game
function returnScreen() {
    document.getElementById("startScreen").style.display = "flex";
    document.getElementById("gameRuleButton").style.display = "block";
}
function resetGame() {
    exchangeNum = 0;
    time = "game";
    turn = Math.random()<0.5 ? "p1":"p2";
    P1AllMoney = 0;
    P2AllMoney = 0;
    p1_selected_card = [];
    p2_selected_card = [];
    p1_hand = []; p2_hand = [];
    if (p1_tip<=0 || p2_tip<=0) {returnScreen();}
    randomHand();
    document.getElementById("p1_explain").innerHTML = "";
    document.getElementById("p2_explain").innerHTML = "";
    document.getElementById("p1_hand").innerHTML = "";
    document.getElementById("p2_hand").innerHTML = "";
    showHandsP1();
    showHandsP2();
    updateTips();
    if (turn=="p1") {autoAction("p1");};
}

//About loaded Contents Process
document.addEventListener("DOMContentLoaded", async function() {
    await preloadImages();
    materials = await loadMaterials("https://kurorosuke.github.io/compounds/obf_extended_min.json");
    await randomHand();
    showHandsP1();
    showHandsP2();
})

//About Win Setting Modal
async function saveWinSettings() {
    acceptNum = document.getElementById("winExcInput").value;
    acceptTurn = document.getElementById("winTurnInput").value;
    closeWinSettings();
}
function openSetting() {
    document.getElementById("winSettingsModal").style.display = "block";
}
async function closeWinSettings() {
    document.getElementById("winSettingsModal").style.display = "none";
}

// 自動的に行動（例：コール or チェック）
function autoAction(player) {
    if (P1AllMoney > P2AllMoney) {
        if (player === "p2") {
            PressCallButton("p2");
        } else {
            PressCheckButton("p1");
        }
    } else if (P1AllMoney < P2AllMoney) {
        if (player === "p1") {
            PressCallButton("p1");
        } else {
            PressCheckButton("p2");
        }
    } else {
        PressCheckButton(player);
    }
}
