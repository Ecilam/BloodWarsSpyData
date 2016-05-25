(function(){
// coding: utf-8
// ==UserScript==
// @author      Ecilam
// @name        Blood Wars Spy Data
// @version     2016.05.25
// @namespace   BWSD
// @description Mémorise ressources et bâtiments de vos espionnages
// @copyright   2012-2014, Ecilam
// @license     GPL version 3 ou suivantes; http://www.gnu.org/copyleft/gpl.html
// @homepageURL https://github.com/Ecilam/BloodWarsSpyData
// @supportURL  https://github.com/Ecilam/BloodWarsSpyData/issues
// @include     /^http:\/\/r[0-9]*\.fr\.bloodwars\.net\/.*$/
// @include     /^http:\/\/r[0-9]*\.bloodwars\.net\/.*$/
// @include     /^http:\/\/r[0-9]*\.bloodwars\.interia\.pl\/.*$/
// @include     /^http:\/\/beta[0-9]*\.bloodwars\.net\/.*$/
// @grant none
// ==/UserScript==
"use strict";

function _Type(v){
	var type = Object.prototype.toString.call(v);
	return type.slice(8,type.length-1);
	}
function _Exist(v){
	return _Type(v)!='Undefined';
	}
String.prototype.truncate = function(length){
	if (this.length > length) return this.slice(0, length - 3) + "...";
	else return this;
	};

/******************************************************
* DEBUG
******************************************************/
var debug = false,
	debug_time = Date.now();

/******************************************************
* OBJET JSONS - JSON
* - stringification des données
******************************************************/
var JSONS = (function(){
	function reviver(key,v){
		if (_Type(v)=='String'){
			var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(v);
			if (a!==null) return new Date(Date.UTC(+a[1],+a[2]-1,+a[3],+a[4],+a[5],+a[6]));
			}
		return v;
		}
	return {
		_Decode: function(v){
			var r = null;
			try	{
				r = JSON.parse(v,reviver);
				}
			catch(e){
				console.error('JSONS_Decode error :',v,e);
				}
			return r;
			},

		_Encode: function(v){
			return JSON.stringify(v);
			}
		};
	})();

/******************************************************
* OBJET LS - Datas Storage
* - basé sur localStorage
* Note : localStorage est lié au domaine
******************************************************/
var LS = (function(){
	var LS = window.localStorage;
	return {
		_GetVar: function(key,defaut){
			var v = LS.getItem(key); // if key does not exist return null 
			return ((v!==null)?JSONS._Decode(v):defaut);
			},
		_SetVar: function(key,v){
			LS.setItem(key,JSONS._Encode(v));
			return v;
			},
		_Delete: function(key){
			LS.removeItem(key);
			return key;
			},
		_Length: function(){
			return LS.length;
			},
		_Key: function(index){
			return LS.key(index);
			}
		};
	})();

/******************************************************
* OBJET DOM - Fonctions DOM & QueryString
* -  DOM : fonctions d'accès aux noeuds du document
* - _QueryString : accès aux arguments de l'URL
******************************************************/
var DOM = (function(){
	return {
		_GetNodes: function(path,root){
			return (_Exist(root)&&root===null)?null:document.evaluate(path,(_Exist(root)?root:document), null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			},
		_GetFirstNode: function(path,root){
			var r = this._GetNodes(path,root);
			return (r!==null&&r.snapshotLength>=1?r.snapshotItem(0):null);
			},
		_GetFirstNodeTextContent: function(path,defaultValue,root){
			var r = this._GetFirstNode(path,root);
			return (r!==null&&r.textContent!==null?r.textContent:defaultValue);
			},
		_GetFirstNodeInnerHTML: function(path,defaultValue,root){
			var r = this._GetFirstNode(path,root);
			return (r!==null&&r.innerHTML!==null?r.innerHTML:defaultValue);
			},
		_$: function(a){
			return document.getElementById(a);
			},
		_CleanNode: function(node){
			while (node.hasChildNodes()){
				node.removeChild(node.firstChild);
				}
			},
		_QueryString: function(key){
			var url = window.location.search,
				reg = new RegExp("[?&]"+key+"(=([^&$]+)|)(&|$)","i"),
				offset = reg.exec(url);
			if (offset!==null){
				offset = _Exist(offset[2])?offset[2]:true;
				}
			return offset;
			}
		};
	})();

/******************************************************
* OBJET IU - Interface Utilsateur
******************************************************/
var IU = (function(){
	return {
		_CreateElements: function(list,oldList){
			var r = _Exist(oldList)?oldList:{};
			for (var key in list){
				if (list.hasOwnProperty(key)){
					var node = _Exist(r[list[key][4]])?r[list[key][4]]:list[key][4];
					r[key] = this._CreateElement(list[key][0],list[key][1],list[key][2],list[key][3],node);
					}
				}
			return r;
			},
		_CreateElement: function(type,attributes,content,events,node){
			var r = document.createElement(type);
			for (var key in attributes){
				if (attributes.hasOwnProperty(key)){
					if (_Type(attributes[key])!='Boolean') r.setAttribute(key,attributes[key]);
					else if (attributes[key]===true) r.setAttribute(key,key.toString());
					}
				}
			for (key in events){
				if (events.hasOwnProperty(key)){
					this._addEvent(r,key,events[key][0],events[key][1]);
					}
				}
			for (var i=0; i<content.length; i++){
				if (_Type(content[i])==='Object') r.appendChild(content[i]);
				else r.textContent+= content[i];
				}
			if (node!==null) node.appendChild(r);
			return r;
			},
		_addEvent: function(obj,type,fn,par){
			var funcName = function(event){return fn.call(obj,event,par);};
			obj.addEventListener(type,funcName,false);
			if (!obj.BWSDListeners) {obj.BWSDListeners = {};}
			if (!obj.BWSDListeners[type]) obj.BWSDListeners[type]={};
			obj.BWSDListeners[type][fn.name]=funcName;
			},
		_removeEvent: function(obj,type,fn){
			if (obj.BWSDListeners[type]&&obj.BWSDListeners[type][fn.name]){
				obj.removeEventListener(type,obj.BWSDListeners[type][fn.name],false);
				delete obj.BWSDListeners[type][fn.name];
				}
			},
		_removeEvents: function(obj){
			if (obj.BWSDListeners){
				for (var key in obj.BWSDListeners){
					if (obj.BWSDListeners.hasOwnProperty(key)){
						for (var key2 in obj.BWSDListeners[key]){
							if (obj.BWSDListeners[key].hasOwnProperty(key2)){
								obj.removeEventListener(key,obj.BWSDListeners[key][key2],false);
								}
							}
						}
					}
				delete obj.BWSDListeners;
				}
			}
		};
	})();

/******************************************************
* OBJET L - localisation des chaînes de caractères (STRING) et expressions régulières (RegExp)
******************************************************/
var L = (function(){
	var locStr =  {
		//DATAS
		"sDeconnecte":
			["Vous avez été déconnecté en raison d`une longue inactivité.",
			"You have been logged out because of inactivity.",
			"Nastąpiło wylogowanie z powodu zbyt długiej bezczynności."],
		"sCourtePause":
			["Une courte pause est en court en raison de l`actualisation du classement général",
			"Please wait a moment while the rankings are being updated.",
			"Trwa przerwa związana z aktualizacją rankingu gry."],
		//INIT
		"sUnknowID":
			["BloorWarsSpyData - Erreur :\n\nLe nom de ce vampire doit être lié à son ID. Merci de consulter la Salle du Trône pour rendre le script opérationnel.\nCe message est normal si vous utilisez ce script pour la première fois ou si vous avez changé le nom du vampire.",
			"BloorWarsSpyData - Error :\n\nThe name of this vampire must be linked to her ID. Please consult the Throne Room to make the script running.\nThis message is normal if you use this script for the first time or if you changed the name of the vampire.",
			"BloorWarsSpyData - Błąd :\n\nNazwa tego wampira musi być związana z jej ID. Proszę zapoznać się z sali tronowej, aby skrypt uruchomiony.\nTo wiadomość jest normalne, jeśli użyć tego skryptu po raz pierwszy lub jeśli zmienił nazwę wampira."],
		// chaines de l'interface
		"sTitle":["Spy Data"],
		"sReportMax":["Lignes: ","Lines: ","Linie: "],
		"sRAZ":["RAZ","Reset","Reset"],
		"sRes":["Ressources","Resources","Zasoby"],
		"sBat":["Bâtiments","Buildings","Budynek"],
		"sOpt":["Options","Options","Opcje"],
		"sAskRAZ":["Voulez vous effacer la totalité des données ?","Want to erase all the data?","Chcesz usunąć wszystkie dane?"],
		"sHead1":[["DATE","NOM","RÉUSSITE(%)","ESPIONS","LOL","POPULATION","SANG"],
				["DATE","NAME","SUCCESS(%)","SPIES","LGO","POPULATION","BLOOD"],
				["DATA","IMIĘ","SUKCESU(%)","SZPIEDZY","PLN","LUDZIE","KREW"]],
		"sHead2":[["DATE","NOM","ZONE","AE","MC","BO","PP","MR","AP","GA","TF","UR","MP","QL","HÔ","CI","BS","CA","AR","MN","AT"],
				["DATE","NAME","AREA","EA","BR","SH","PS","VS","BA","GA","AS","SU","PA","DN","HO","GY","BB","CH","AR","OM","TC"],
				["DATA","IMIĘ","STREFA","PO","DP","RZ","PP","SB","AO","GA","HB","PT","LO","DL","SZ","CM","BK","KA","ZB","SR","PT"]],
		"sTriAdrTest":["([0-9]+)\\/([0-9]+)\\/([0-9]+)"],
		// chaines pour l'espionnage
		"sSpyTime":["registerTimer\\('$1', ([0-9]+)\\)"], //				gameTimers.registerTimer('spy_0', 83)
		"sMidMsg":["addMsgId\\(([0-9]+)\\)"], //						.addMsgId(125633417)
		"sSpyMsg": ["Rapport de l`opération - cible: (.+)\\.",
				"Spy report - target: (.+)\\.",
				"Raport szpiegowski - cel: (.+)\\."],
		"sSpyTargetIUD":["Cible de l`espionnage: <a class=\"players\" href=\"\\?a=profile&amp;uid=([0-9]+)\"><b>([^<>]+)<\\/b><\\/a>",
				"Target: <a class=\"players\" href=\"\\?a=profile&amp;uid=([0-9]+)\"><b>([^<>]+)<\\/b><\\/a>",
				"Cel szpiegowania: <a class=\"players\" href=\"\\?a=profile&amp;uid=([0-9]+)\"><b>([^<>]+)<\\/b><\\/a>"],
		"sSpyZone":["Territoire: <a href=\"\\?a=townview&amp;strefa=([0-9]+)&amp;sektor=([0-9]+)\">([^<>]+)<\\/a>",
				"Territory: <a href=\"\\?a=townview&amp;strefa=([0-9]+)&amp;sektor=([0-9]+)\">([^<>]+)<\\/a>",
				"Teren: <a href=\"\\?a=townview&amp;strefa=([0-9]+)&amp;sektor=([0-9]+)\">([^<>]+)<\\/a>"],
		"sSpyNbspy":["Le nombre d`espions: <b>([0-9]+)<\\/b>",
				"Number of spies: <b>([0-9]+)<\\/b>",
				"Ilość szpiegów: <b>([0-9]+)<\\/b>"],
		"sSpyChance":["Probabilité de ne pas être détecté: <b>([^<>]+) %</b>",
				"Chance of remaining undetected: <b>([^<>]+) %</b>",
				"Szansa na pozostanie niewykrytym: <b>([^<>]+) %</b>"],
		"sSpyOk":["<b>Tes espions sont revenus inaperçus.<\\/b>",
				"<b>Your spies returned undetected.<\\/b>",
				"<b>Twoi szpiedzy powrócili niewykryci.<\\/b>"],
		"sSpyMoney":["Argent: <b>([0-9 ]+) LOL</b>","Money: <b>([0-9 ]+) Lgo</b>","Pieniądze: <b>([0-9 ]+) PLN</b>"],
		"sSpyPop":["Population: <b>([0-9 ]+)<\\/b>","People: <b>([0-9 ]+)<\\/b>","Ludzie: <b>([0-9 ]+)<\\/b>"],
		"sSpyBlood":["Sang: <b>([0-9 ]+)<\\/b>","Blood: <b>([0-9 ]+)<\\/b>","Krew: <b>([0-9 ]+)<\\/b>"],
		"sSpyBats":["Les niveaux des bâtiments:","Buildings` levels:","Poziomy budynków:"],
		"sSpyBat":["<br>$1: <b>([0-9]+)<\\/b>"],
		"sBats":[["AGENCE D`EMPLOI","MAISON CLOSE","BOUCHERIE","POSTE DE POLICE","MAISON DE REFUGE","AGENCE DE PROTECTION","GARNISON","TRAFIQUANT D`ARMES","URGENCES","MONT DE PIÉTÉ","QUOTIDIEN LOCAL \"DANSE MACABRE\"","HÔPITAL","CIMETIÈRE","BANQUE DE SANG","CATHÉDRALE","ARMURERIE","MARCHÉ NOIR","ARRÊT TAXI"],
				["EMPLOYMENT AGENCY","BROTHEL","SLAUGHTERHOUSE","POLICE STATION","VAGRANTS` SHELTER","BODYGUARD AGENCY","GARRISON","ARM SHOP","SURGERY","PAWNSHOP","DAILY NEWSPAPER `NIGHTSHIFT`","HOSPITAL","GRAVEYARD","BLOOD BANK","CHURCH","ARMOURY","OLD MARKET","TAXICAB"],
				["POŚREDNIAK","DOM PUBLICZNY","RZEŹNIA","POSTERUNEK POLICJI","SCHRONISKO DLA BEZDOMNYCH","AGENCJA OCHRONY","GARNIZON","HANDLARZ BRONIĄ","POGOTOWIE","LOMBARD","DZIENNIK LOKALNY \"NOCNA ZMIANA\"","SZPITAL","CMENTARZ","BANK KRWI","KATEDRA","ZBROJOWNIA","STARY RYNEK","POSTÓJ TAXI"]],
		 };
	var langue; // 0 = français par défaut, 1 = anglais, 2 = polonais
	if (/^http\:\/\/r[0-9]*\.fr\.bloodwars\.net/.test(location.href)) langue = 0;
	else if (/^http\:\/\/r[0-9]*\.bloodwars\.net/.test(location.href)) langue = 1;
	else if (/^http\:\/\/r[0-9]*\.bloodwars\.interia\.pl/.test(location.href)||/^http\:\/\/beta[0-9]*\.bloodwars\.net/.test(location.href)) langue = 2;
	else langue = 0;
	return {
	//public stuff
		// Retourne la chaine ou l'expression traduite.
		// Remplace les éléments $1,$2... par les arguments transmis en complément.
		// Le caractère d'échappement '\' doit être doublé pour être pris en compte dans une expression régulière.
		// ex: "test": ["<b>$2<\/b> a tué $1 avec $3.",]
		// L._Get('test','Dr Moutarde','Mlle Rose','le chandelier'); => "<b>Mlle Rose<\/b> a tué le Dr Moutarde avec le chandelier."
		_Get: function(key){
			var r = locStr[key];
			if (!_Exist(r)) throw new Error("L::Error:: la clé n'existe pas : "+key);
			if (_Exist(r[langue])) r = r[langue];
			else r = r[0];
			for (var i=arguments.length-1;i>=1;i--){
				var reg = new RegExp("\\$"+i,"g");
				r = r.replace(reg,arguments[i]);
				}
			return r;
			}
		};
	})();

/******************************************************
* OBJET DATAS - Fonctions d'accès aux données de la page
* Chaque fonction retourne 'null' en cas d'échec
******************************************************/
var DATAS = (function(){
	var serverTime = window.serverTime,
    serverOffset = window.serverOffset,
    clientTimeData =  new Date(),
    clientTime = Math.floor(clientTimeData.getTime() / 1000),
    clientOffset = clientTimeData.getTimezoneOffset() * 60,
    diff = _Exist(serverTime) && _Exist(serverOffset)? (serverTime - clientTime + serverOffset + clientOffset) * 1000 : null,
		gameTime = diff !== null ? new Date(clientTimeData.getTime() + diff) : null;

	return {
	/* données du serveur */
		_Time: function(){
			return gameTime;
			},
	/* données du joueur */
		_PlayerName: function(){
			return DOM._GetFirstNodeTextContent("//div[@class='stats-player']/a[@class='me']", null);
			},
	/* Données diverses	*/
		_GetPage: function(){
			var p = 'null',
			// message Serveur (à approfondir)
				r = DOM._GetFirstNode("//div[@class='komunikat']");
			if (r!==null){
				var r = DOM._GetFirstNodeTextContent(".//u",r);
				if (r == L._Get('sDeconnecte')) p="pServerDeco";
				else if (r == L._Get('sCourtePause')) p="pServerUpdate";
				else p="pServerOther";
				}
			else{
				var qsA = DOM._QueryString("a"),
					qsDo = DOM._QueryString("do"),
					qsMid = DOM._QueryString("mid"),
					path = window.location.pathname;
				// page extérieur
				if (path!="/"){
					if (path=="/showmsg.php"&&qsA===null&&qsMid!==null) p="pShowMsg";
					else if (path=="/showmsg.php"&&qsA=="profile") p="pShowProfile";
					else if (path=="/test_items.php") p="pShowItems";
					else p="pShowOther";
					}
				// page interne
				// Profile
				else if (qsA=="profile"){
					var qsUid = DOM._QueryString("uid");
					var qsEdit = DOM._QueryString("edit");
					if (qsUid===null) p="pOProfile";
					else if (!!qsEdit) p="pOProfileEdit";
					else p="pProfile";
					}
				// Version
				else if (qsA=="changelog") p="PChangelog";
				// Premium
				else if (qsA=="premium"){
					if (qsDo===null||qsDo=="prolong") p="pProlongPremium";
					else if (qsDo=="services") p="pServicesPremium";
					else if (qsDo=="history") p="pHistoryPremium";
					}
				// Salle du Trône
				else if (qsA===null||qsA=="main") p="pMain";
				// Entrainement
				else if (qsA=="training") p="pTraining";
				// Site de construction
				else if (qsA=="build") p="pBuild";
				// Vue sur la Cité
				else if (qsA=="townview") p="pTownview";
				// Clan
				else if (qsA=="aliance"){
					if (qsDo=="list") p="pAlianceList";
					else if (qsDo=="newclan") p="pNewAliance"; // créér
					else if (qsDo=="apply") p="pApplyAliance"; // joindre
					else if (qsDo=="editclan") p="pEditAliance";
					else if (qsDo=="applies") p="pAppliesAliance";
					else if (qsDo==null||qsDo=="leave"||qsDo=="togrec") p="pOAliance";
					else if (qsDo=="view"){
						var r = DOM._GetFirstNode("//div[@class='top-options']/span[@class='lnk']");
						if (r!==null) p="pOAliance";
						else p="pAliance";
						}
					} 
				// Demeure du Clan
				else if (qsA=="clanbld") p = "pClanbld";
				// Magasin
				else if (qsA=="townshop") p="pTownshop";
				// Souvenir
				else if (qsA=="sshop") p = "pSshop";
				// Armurerie
				else if (qsA=="equip") p="pEquip";
				// Talismans
				else if (qsA=="talizman"){
					if (qsDo===null||qsDo=="main") p="pTalisman";
					else if (qsDo=="runes") p="pRunes";
					}
				// Commerce
				else if (qsA=="trade"){
					if (qsDo===null) p="pTrade";
					else if (qsDo=="newtrade") p="pNewtrade";
					else if (qsDo=="tradelog") p="pTradelog";
					}
				// Enchères - Moria I
				else if (qsA=="auction"){
					if (qsDo===null||qsDo=="watched") p="pAuctionWatched";
					else if (qsDo=="new") p="pAuctionNew";
					else if (qsDo=="itemlist") p="pAuctionItemList";
					else if (qsDo=="closed") p="pAuctionClosed";
					}
				// Le Puits des Âmes - Moria I
				else if (qsA=="mixer"){
					if (qsDo===null||qsDo=="mkstone") p="pMkstone";
					else if (qsDo=="upgitem") p="pUpgitem";
					else if (qsDo=="mixitem") p="pMixitem";
					else if (qsDo=="destitem") p="pDestitem";
					else if (qsDo=="tatoo") p="pTatoo";
					}
				// Préparer une embuscade
				else if (qsA=="ambush"){
					var qsOpt = DOM._QueryString("opt");
					if (qsOpt===null) p="pAmbushRoot";
					else if (qsOpt=="spy") p="pAmbushSpy";
					else if (qsOpt=="atk") p="pAmbushAtk";
					else if (qsOpt=="ambush") p="pAmbush";
					}
				// Quêtes
				else if (qsA=="quest"){
					var qbsel = DOM._QueryString("qbsel");
					if (qbsel===true) p="pQuestSel";
					else if (DOM._GetFirstNode("//*[@id='quest_timeleft']")!==null) p="pQuestProgress";
					else p="pQuestLaunch";
					}
				// Expéditions
				else if (qsA=="cevent"){
					var currentExpe = DOM._GetFirstNode("//td[@class='ambinprogress']")!==null;
					if ((qsDo===null&&currentExpe)||qsDo=="current") p="pCurrentExpe";
					else if ((qsDo===null&&!currentExpe)||qsDo=="new") p="pNewExpe";
					else if (qsDo=="sacrifice") p="pSacrificeExpe";
					}
				// Roi de la Colline
				else if (qsA=="swr"){
					var currentRdc = DOM._GetFirstNode("//td[@class='ambinprogress']")!==null;
					if ((qsDo===null&&currentRdc)||qsDo=="current") p="pCurrentSwr";
					else if ((qsDo===null&&!currentRdc)||qsDo=="new") p="pNewSwr";
					else if (qsDo=="enchant") p="pEnchantSwr";
					}
				// Page L’Arène
				else if (qsA=="newarena") p="pArena";
				// Page Missions
				else if (qsA=="tasks") p="pTasks";
				// Page des messages
				else if (qsA=="msg"){
					var qsType = DOM._QueryString("type");
					if (qsDo===null||qsDo=="list"){
						if (qsType===null||qsType=="1") p="pMsgList";
						else if (qsType=="2") p="pMsgSaveList";
						else if (qsType=="3") p="pMsgSendList";
						}
					else if (qsDo=="clanmsg") p="pMsgClan";
					else if (qsDo=="write") p="pMsgWrite";
					else if (qsDo=="fl") p="pMsgFriendList";
					else if (qsDo=="view" && qsMid!==null){
						if (qsType===null||qsType=="1") p="pMsg";
						else if (qsType=="2") p="pMsgSave";
						else if (qsType=="3") p="pMsgSend";
						}
					}
				// Page Notes
				else if (qsA=="notes") p="pNotes";
				// Page Classement
				else if (qsA=="rank") p="pRank";
				// Page Préférences
				else if (qsA=="settings"){
					if (qsDo===null) p="pRootSettings";
					else if (qsDo=="ai") p="pSettingsAi";
					else if (qsDo=="acc") p="pSettingsAcc";
					else if (qsDo=="vac") p="pSettingsVac";
					else if (qsDo=="delchar") p="pSettingsDelchar";
					}
				// Page Rapporter à l`opérateur
				else if (qsA=="report") p="pReport";
				// Page Copyright
				else if (qsA=="developer") p="pCopyright";
				}
			return p;
			}
		};
	})();

/******************************************************
* OBJET PREF - Gestion des préférences
******************************************************/
var PREF = (function(){
	// préfèrences par défaut
	var index = 'BWSD:O:',
		defPrefs = {'set':[1,'',0,
			{'tri':[1,0],'col':[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1]]},
			{'tri':[1,0],'col':[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[18,1],[19,1],[20,1]]}]};
			// 0:show,1:max,2:menu,3:ressource,4:batiments
	var ID = null, prefs = {};
	return {
		_Init: function(id){
			ID = id;
			prefs = LS._GetVar(index+id,{});
			},
		_Get: function(key){
			if (_Exist(prefs[key])) return prefs[key];
			else if (_Exist(defPrefs[key]))return defPrefs[key];
			else return null;
			},
		_Set: function(key,v){
			if (ID!==null){
				prefs[key] = v;
				LS._SetVar(index+ID,prefs);
				return v;
				}
			else throw new Error("Erreur : les préférences n'ont pas été initialisées.");
			},
		_Raz: function(){
			prefs = {};
			if (ID!==null) LS._Delete(index+ID);
			else throw new Error("Erreur : les préférences n'ont pas été initialisées.");
			}
		};
	})();

/******************************************************
CSS
******************************************************/
function SetCSS(){
	var css = 
		[".BWSDtriSelect{color:lime;}",
		".BWSDbold{font-weight: bold;}",
		".BWSDmenu{margin-left:auto;margin-right:auto;padding:0;border-collapse:collapse;}",
		".BWSDp1{font-weight: 700;white-space: nowrap;padding: 1px;text-align: left;}",
		".BWSDp2{white-space: nowrap;cursor: pointer;padding: 1px;text-align: left;}",
		".BWSDp3{width: 10px;white-space: nowrap;padding: 1px;text-align: left;}",
		".BWSDp3 a{cursor: pointer;}",
		".BWSDbl,.BWSDhl{text-align:left;white-space: nowrap;}",
		".BWSDbr,.BWSDhr{text-align:right;}",
		".BWSDhl,.BWSDDel{font-weight: bold;cursor: pointer;padding: 0 3px;}",
		".BWSDbl,.BWSDbr,.BWSDDel{border-right:0;border-left:0;border-top:thin solid black;border-bottom:thin solid black;padding: 0 3px;color: black;}",
		".BWSDDel{text-align:center;border:thin solid black;width:3em;color:white;background-color:red}",
		".BWSDBut,.BWSDButError{height:10px;margin:2px 0px;}",
		".BWSDButError{background-color:red;}"],
		head = DOM._GetFirstNode("//head");
	if (head!==null) IU._CreateElement('style',{'type':'text/css'},[css.join('')],{},head);
	}

/******************************************************
* FUNCTIONS
******************************************************/
function showIU(){
	set[0] = !set[0];
	PREF._Set('set',set);
	nodesIU.divIU.setAttribute('style','display:'+(set[0]==1?'block;':'none;'));
	}
function clickMenu(e,i){ // i= menu
	set[2] = i;
	PREF._Set('set',set);
	updateTable();
	}
function clickCol(e,i){ // i= col
	var tri = set[3+set[2]].tri;
	tri[1] = (i==tri[0]&&tri[1]==1)?0:1;
	tri[0] = i;
	PREF._Set('set',set);
	updateTable();
	}
function spyRAZ(){
	var answer = confirm(L._Get("sAskRAZ"));
	if (answer){
		list = LS._SetVar('BWSD:LIST:'+ID,{});
		updateTable();
		}
	}
function spyDel(e,i){
	delete list[i];
	LS._SetVar('BWSD:LIST:'+ID,list);
	updateTable();
	}
function inputNumber(e){
	var v = e.target.value,
		r = new RegExp("^(|(?:[0-9]+))$").exec(v);
	if (r!==null){
		e.target.setAttribute('class','BWSDBut');
		set[1] = v;
		PREF._Set('set',set);
		updateTable();
		}
	else e.target.setAttribute('class','BWSDButError');
	}
function changeMCol(e,i){// i[0]= liste, i[1]= ligne, i[2]= ligne + ou -, i[3]= node
	var col = set[3+i[0]].col;
	col[i[1]] = [col[i[1]+i[2]],col[i[1]+i[2]]=col[i[1]]][0];//swap
	PREF._Set('set',set);
	createMCol(i[0],i[3]);
	}
function clickMCol(e,i){// i[0]= liste, i[1]= ligne, i[2]= node
	var col = set[3+i[0]].col;
	col[i[1]][1] = col[i[1]][1]==1?0:1;
	PREF._Set('set',set);
	createMCol(i[0],i[2]);
	}
function createMCol(i,node){
	var col = set[3+i].col,
		titles = i===0?L._Get('sHead1'):L._Get('sHead2');
	DOM._CleanNode(node);
	for (var j=0;j<col.length;j++){
		var cell = IU._CreateElements({
			'tr':['tr',{'class':(j%2==1?'even':''),'onmouseout':"this.className="+(j%2==1?"'even';":"'';"),'onmouseover':"this.className='selectedItem';"},[],{},node],
			'td1':['td',{'class':'BWSDp1'},[j],{},'tr'],
			'td2':['td',{'class':'BWSDp2 '+(col[j][1]==1?'defHit':'atkHit'),'style':'text-decoration:'+(col[j][1]==1?'none':'line-through')},[i==1&&col[j][0]>2?L._Get("sBats")[col[j][0]-3]:titles[col[j][0]]],{'click':[clickMCol,[i,j,node]]},'tr'],
			'td3':['td',{'class':'BWSDp3'},[],{},'tr']
			});
		if (j!==0) IU._CreateElement('a',{},["▲"],{'click':[changeMCol,[i,j,-1,node]]},cell.td3);
		if (j<col.length-1) IU._CreateElement('a',{},["▼"],{'click':[changeMCol,[i,j,1,node]]},cell.td3);
		}
	}
function updateTable(){
	DOM._CleanNode(nodesIU.menu);
	DOM._CleanNode(nodesIU.theadS);
	DOM._CleanNode(nodesIU.tbodyS);
	IU._CreateElements({
			'span00':['span',{},[],{},nodesIU.menu],
			's1':['a',{'href':'#','onclick':'return false;','class':(set[2]===0?'active':'')},[L._Get('sRes')],{'click':[clickMenu,0]},'span00'],
			's2':['span',{},[' | '],{},'span00'],
			's3':['a',{'href':'#','onclick':'return false;','class':(set[2]==1?'active':'')},[L._Get('sBat')],{'click':[clickMenu,1]},'span00'],
			's4':['span',{},[' | '],{},'span00'],
			's5':['a',{'href':'#','onclick':'return false;','class':(set[2]==2?'active':'')},[L._Get('sOpt')],{'click':[clickMenu,2]},'span00'],
			'span01':['span',{'style':'float:right;'},[],{},nodesIU.menu],
			'span010':['span',{},[L._Get('sReportMax')],{},'span01'],
			'span011':['input',{'type':'text','class':'BWSDBut','value':set[1],'size':'2','maxlength':'3'},[],{'change':[inputNumber],'blur':[inputNumber]},'span01'],
			'span012':['span',{},[("/ "+Object.keys(list).length)],{},'span01'],
			});
	if (set[2]>1){ // options
		var menu = IU._CreateElements({
			'tr0':['tr',{},[],{},nodesIU.tbodyS],
			'td0_0_0':['td',{'style':'vertical-align:top;'},[],{},'tr0'],
			'table1':['table',{'class':'BWSDmenu'},[],{},'td0_0_0'],
			'thead1':['thead',{},[],{},'table1'],
			'tr1_0':['tr',{'class':'tblheader'},[],{},'thead1'],
			'td1_0_0':['th',{'colspan':'3'},[L._Get('sRes')],{},'tr1_0'],
			'tbody1':['tbody',{},[],{},'table1'],
			'td0_0_1':['td',{'style':'vertical-align:top;'},[],{},'tr0'],
			'table2':['table',{'class':'BWSDmenu'},[],{},'td0_0_1'],
			'thead2':['thead',{},[],{},'table2'],
			'tr2_0':['tr',{'class':'tblheader'},[],{},'thead2'],
			'td2_0_0':['th',{'colspan':'3'},[L._Get('sBat')],{},'tr2_0'],
			'tbody2':['tbody',{},[],{},'table2']
			});
		createMCol(0,menu.tbody1);
		createMCol(1,menu.tbody2);
		}
	else {
		var list2 = [],
			tri = set[3+set[2]].tri;
		//créé le tableau pour tri ultérieur
		for (var key in list){ //key:[msgId,time,spyInfo]
			if (list.hasOwnProperty(key)){
				var info = list[key][2]!==null?list[key][2]:[0,null,[],[],[]], //[type,iud,r,res,bat]
					col = [list[key][1],key];
				if (set[2]===0) col = col.concat((info[2][2]?info[2][2]:''),(info[2][1]?info[2][1]:''),(info[3][0]?info[3][0]:''),(info[3][1]?info[3][1]:''),(info[3][2]?info[3][2]:''));
				else{
					col.push(info[2][0]?info[2][0]:'');
					for (var i=0;i<L._Get('sBats').length;i++){col.push(info[4][i]?info[4][i]:'');}
					}
				list2.push([info[0],info[1],col]);//[type,iud,col];
				}
			}
		// tri du tableau suivant la colonne sélectionnée
		list2.sort(function(a,b){
			var x = a[2][tri[0]].toString().toUpperCase(),
				y = b[2][tri[0]].toString().toUpperCase();
			if (set[2]==1&&tri[0]==2){ // colonne "adresse"
				var r = new RegExp(L._Get('sTriAdrTest')).exec(x),
					r2 = new RegExp(L._Get('sTriAdrTest')).exec(y);
				if (r!==null) x = parseInt(r[1])*100000+parseInt(r[2])*100+parseInt(r[3]);
				if (r2!==null) y = parseInt(r2[1])*100000+parseInt(r2[2])*100+parseInt(r2[3]);
				}
			else if (tri[0]!=1){
				x = parseFloat(x.replace(/ /g,''));
				y = parseFloat(y.replace(/ /g,''));
				if(isNaN(x)===true) x=-1;
				if(isNaN(y)===true) y=-1;
				}
			return x<y?-1:x==y?0:1;
			});
		if (tri[1]===0) list2.reverse();
		var col = set[3+set[2]].col,
			titles = set[2]===0?L._Get('sHead1'):L._Get('sHead2'),
			tr2 = IU._CreateElement('tr',{'class':'tblheader'},[],{},nodesIU.theadS);
		for (var i=0;i<col.length;i++){
			if (col[i][1]==1){
				var th = IU._CreateElement('th',{'class':'BWSDhl '},[titles[col[i][0]]],{'click':[clickCol,col[i][0]]},tr2);
				if (set[2]==1&&col[i][0]>2){
					th.setAttribute('onmouseout','nd();');
					th.setAttribute('onmouseover',"return overlib('"+L._Get("sBats")[col[i][0]-3]+"',HAUTO,WRAP);");
					}
				if (col[i][0]==tri[0]) IU._CreateElement('span',{'class':'BWSDtriSelect'},[(tri[1]==1?"▲":"▼")],{},th);
				}
			}
		IU._CreateElement('th',{'class':'BWSDDel'},[L._Get('sRAZ')],{'click':[spyRAZ]},tr2);
		DOM._CleanNode(nodesIU.tbodyS);
		for (var i=0;(i<list2.length&&i<(set[1]===''?list2.length:set[1]));i++){
			var tr = IU._CreateElement('tr',{'style':'background-color:'+(list2[i][0]==1?'Green':list2[i][0]==-1?'Red':'white')},[],{},nodesIU.tbodyS);
			for (var j=0;j<col.length;j++){
				if (col[j][1]==1){
					var v = col[j][0]===0?(new Date(list2[i][2][0])).toLocaleDateString():col[j][0]==1?'':list2[i][2][col[j][0]],
						td = IU._CreateElement('td',{'class':'BWSDbl'},[v],{},tr);
					if (col[j][0]==1) list2[i][1]!==null?IU._CreateElement('a',{'href':'?a=profile&uid='+list2[i][1]},[list2[i][2][1]],{},td):IU._CreateElement('span',{},[list2[i][2][1]],{},td);
					}
				}
			IU._CreateElement('td',{'class':'BWSDDel'},['X'],{'click':[spyDel,list2[i][2][1]]},tr);
			}
		}
	}
function updateLogS(player,msgId,msgTime,spyInfo){
	msgTime = (_Type(msgTime)=='Date')?msgTime.getTime():null;
	if (_Exist(list[player])){
		if (msgId!=list[player][0]){
			if ((msgTime!==null)&&(msgTime>list[player][1])) list[player] = [msgId,msgTime,spyInfo];
			}
		else if (spyInfo!==null) list[player][2] = spyInfo;
		}
	else if (msgTime!==null) list[player] = [msgId,msgTime,spyInfo];
	LS._SetVar('BWSD:LIST:'+ID,list);
	}

/******************************************************
* START
* 
******************************************************/
// vérification des services
if (!JSON) throw new Error("Erreur : le service JSON n\'est pas disponible.");
else if (!window.localStorage) throw new Error("Erreur : le service localStorage n\'est pas disponible.");
else{
	var p = DATAS._GetPage(),
		player = DATAS._PlayerName(),
		IDs = LS._GetVar('BWSD:IDS',{});
if (debug) console.debug('BWSDstart: ',player,IDs,p);
	// Pages gérées par le script
	if (['null','pShowProfile','pShowMsg','pShowOther','pShowItems','pServerDeco','pServerUpdate','pServerOther'].indexOf(p)==-1&&player!==null){
		// Salle du Trône
		if (p=='pMain'){
			var r = DOM._GetFirstNodeTextContent("//div[@id='content-mid']/div[@id='reflink']/span[@class='reflink']",null);
			if (r!==null){
				var r2 = /r\.php\?r=([0-9]+)/.exec(r),
					ID = _Exist(r2[1])?r2[1]:null;
				if (ID!==null){
					for (var i in IDs) if (IDs[i]==ID) delete IDs[i]; // en cas de changement de nom
					IDs[player] = ID;
					LS._SetVar('BWSD:IDS',IDs);
					}
				}
			}
		// Autre pages nécessitant l'ID
		if (_Exist(IDs[player])){
			var ID = IDs[player],
				list = LS._GetVar('BWSD:LIST:'+ID,{});
			PREF._Init(ID);
			var set = PREF._Get('set');
			SetCSS();
			// patch 2015.11.01 -> 2015.11.18
			if (PREF._Get('list')!==null){
				set[0] = PREF._Get('sh');
				set[1] = PREF._Get('max');
				set[2] = PREF._Get('menu');
				set[3].tri = PREF._Get('tri1');
				set[4].tri = PREF._Get('tri2');
				list = PREF._Get('list');
				LS._SetVar('BWSD:LIST:'+ID,list);
				PREF._Raz();
				PREF._Set('set',set);
				}
			if (p=='pMsgList'||p=='pMsgSaveList'){
				var r = DOM._GetNodes("//div[@id='content-mid']//tr[@class='tblheader']/following-sibling::tr");
				for (var i=0;i<r.snapshotLength;i++){
					var node = r.snapshotItem(i),
						msg = DOM._GetFirstNodeTextContent(".//td[2]/a",null,node),
						msgDate = DOM._GetFirstNodeTextContent(".//td[4]",null,node),
						msgId = DOM._GetFirstNode(".//td[1]/input",node);
					// conversion au format Date
					var v = new RegExp("([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})").exec(msgDate);
						msgDate = (v!==null)?new Date(v[1],v[2]-1,v[3],v[4],v[5],v[6]):null;
					if (msg!==null&&msgDate!==null&&msgId!==null){
						var msgId = msgId.getAttribute('id').replace('msgid_',''),
							m1 = new RegExp(L._Get('sSpyMsg')).exec(msg);
						// messages d'espionnage ?
						if (m1!==null) updateLogS(m1[1],msgId,msgDate,null);
						}
					}
				}
			else if (p=='pMsg'||p=='pMsgSave'){
				var t = DOM._GetFirstNodeInnerHTML("//div[@class='msg-content ']", null);
				if (t!==null){
					var r = new RegExp(L._Get('sSpyTargetIUD')).exec(t);// uid cible
					if (r!==null){
						var spyInfo = [0,r[1],[],[],[]],//[type,iud,result,res,bat]
							r1 = new RegExp(L._Get('sSpyZone')).exec(t),// zone
							r2 = new RegExp(L._Get('sSpyNbspy')).exec(t),// espions
							r3 = new RegExp(L._Get('sSpyChance')).exec(t),// % réussite
							r4 = new RegExp(L._Get('sSpyOk')).exec(t),// réussite
							r5 = new RegExp(L._Get('sSpyMoney')).exec(t),// Argent
							r6 = new RegExp(L._Get('sSpyPop')).exec(t),// Population
							r7 = new RegExp(L._Get('sSpyBlood')).exec(t),// Sang
							r8 = new RegExp(L._Get('sSpyBats')).exec(t),// batiments ?
							qsMid = DOM._QueryString("mid");
						if (r1!==null){spyInfo[2][0] = r1[3].replace(/ /g,'');}
						if (r2!==null){spyInfo[2][1] = Number(r2[1]);}
						if (r3!==null){spyInfo[2][2] = r3[1];}
						spyInfo[0] = r4!==null?1:-1;
						if (r5!==null){spyInfo[3][0] = r5[1];}
						if (r6!==null){spyInfo[3][1] = r6[1];}
						if (r7!==null){spyInfo[3][2] = r7[1];}
						if (r8!==null){
							for (var i=0;i<L._Get('sBats').length;i++){
								var bats = new RegExp(L._Get('sSpyBat',L._Get('sBats')[i])).exec(t);
								spyInfo[4][i] = bats!==null?Number(bats[1]):0;
								}
							}
						updateLogS(r[2],qsMid,null,spyInfo);
						}
					}
				}
			else if (p=='pAmbushRoot'){
				var spyaction = DOM._GetNodes("//div[@id='content-mid']//tr/td/span[@class='spyinprogress']");
				for (var i=0;i<spyaction.snapshotLength;i++){
					var node = spyaction.snapshotItem(i),
						spyId = node.getAttribute('id'),
						spyScript = DOM._GetFirstNodeInnerHTML("./parent::td/script",null,node);
					if (spyScript!==null){
						var r = new RegExp(L._Get('sSpyTime',spyId)).exec(spyScript),
							r2 = new RegExp(L._Get('sMidMsg')).exec(spyScript),
							playerVS = DOM._GetFirstNodeTextContent("./parent::td/parent::tr/td/a[@class='players']",null,node),
							msgDate = DATAS._Time();
if (debug) console.debug('pAmbushRoot', r, r2, playerVS, msgDate);
						if (msgDate!==null&&r!==null&&r2!==null&&playerVS!==null){
							msgDate.setTime(msgDate.getTime()+r[1]*1000);
							updateLogS(playerVS,r2[1],msgDate,null);
							}
						}
					}
				}
			// init IU
			var nodeOptions = DOM._GetFirstNode("//div[@class='remark']"),
				contentMid = DOM._GetFirstNode("//div[@id='content-mid']"),
				contentMidChild = DOM._GetFirstNode("//div[@id='content-mid']/*");
			if (nodeOptions!==null&&contentMidChild!==null){
				var nodeTitle = IU._CreateElements({
					'1':['a',{'class':'remark','target':'_blank','href':'#','onclick':'return false;'},[L._Get('sTitle')],{'click':[showIU]},null],
					'2':['span',{},[' | '],{},null]});
				nodeOptions.insertBefore(nodeTitle['2'],nodeOptions.firstChild);
				nodeOptions.insertBefore(nodeTitle['1'],nodeOptions.firstChild);
				var nodesIU = IU._CreateElements({
					'divIU':['div',{'id':'BWSD','style':'display:'+(set[0]==1?'block;':'none;')},[],{},null],
					'fieldset':['fieldset',{'class':'equip'},[],{},'divIU'],
					'legend':['legend',{'class':'arcane-header'},[],{},'fieldset'],
					'l1':['span',{},[L._Get('sTitle')+' '],{},'legend'],
					'l2':['a',{'target':'_blank','href':'https://github.com/Ecilam/BloodWarsSpyData'},[(typeof(GM_info)=='object'?GM_info.script.version:'?')],{},'legend'],
					'menu':['div',{'style':'width:100%'},[],{},'fieldset'],
					'tableS':['table',{'style':'border-collapse:collapse;width:100%'},[],{},'fieldset'],
					'theadS':['thead',{},[],{},'tableS'],
					'tbodyS':['tbody',{},[],{},'tableS'],
					'br':['br',{},[],{},'divIU']});
				contentMid.insertBefore(nodesIU.divIU,contentMidChild);
				updateTable();
				}
			}
		else alert(L._Get("sUnknowID"));
		}
	}
if (debug) console.debug('BWSDend - time %oms',Date.now()-debug_time);
})();
