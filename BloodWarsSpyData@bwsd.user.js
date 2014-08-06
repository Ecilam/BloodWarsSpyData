(function(){
// coding: utf-8
// ==UserScript==
// @author      Ecilam
// @name        Blood Wars Spy Data
// @version     2014.08.06
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

function _Type(value){
	var type = Object.prototype.toString.call(value);
	return type.slice(8,type.length-1);
	}
	
function _Exist(value){
	return _Type(value)!='Undefined';
	}

String.prototype.truncate = function(length){
	if (this.length > length) return this.slice(0, length - 3) + "...";
	else return this;
	};

/******************************************************
* OBJET JSONS - JSON
* - stringification des données
******************************************************/
var JSONS = (function(){
	function reviver(key,value){
		if (_Type(value)=='String'){
			var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
			if (a!=null) return new Date(Date.UTC(+a[1],+a[2]-1,+a[3],+a[4],+a[5],+a[6]));
			}
		return value;
		}
	return {
		_Decode: function(value){
			var result = null;
			try	{
				result = JSON.parse(value,reviver);
				}
			catch(e){
				console.error('JSONS_Decode error :',value,e);
				}
			return result;
			},

		_Encode: function(value){
			return JSON.stringify(value);
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
			var value = LS.getItem(key); // if key does not exist return null 
			return ((value!=null)?JSONS._Decode(value):defaut);
			},
		_SetVar: function(key,value){
			LS.setItem(key,JSONS._Encode(value));
			return value;
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
			var contextNode=(_Exist(root)&&root!=null)?root:document;
			var result=document.evaluate(path, contextNode, null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			return result;
			},
		_GetFirstNode: function(path,root){
			var result = this._GetNodes(path,root);
			return ((result.snapshotLength >= 1)?result.snapshotItem(0):null);
			},
		_GetFirstNodeTextContent: function(path,defaultValue,root){
			var result = this._GetFirstNode(path,root);
			return (((result!=null)&&(result.textContent!=null))?result.textContent:defaultValue);
			},
		_GetFirstNodeInnerHTML: function(path,defaultValue,root){
			var result = this._GetFirstNode(path,root);
			return (((result!=null)&&(result.innerHTML!=null))?result.innerHTML:defaultValue);
			},
		// retourne la valeur de la clé "key" trouvé dans l'url
		// null: n'existe pas, true: clé existe mais sans valeur, autres: valeur
		_QueryString: function(key){
			var url = window.location.search,
				reg = new RegExp("[\?&]"+key+"(=([^&$]+)|)(&|$)","i"),
				offset = reg.exec(url);
			if (offset!=null){
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
		// reçoit une liste d'éléments pour créér l'interface
		// ex: {'name':['input',{'type':'checkbox','checked':true},['coucou'],{'click':[funcname,5]},body]
		_CreateElements: function(list){
			var result = {};
			for (var key in list){
				var type = _Exist(list[key][0])?list[key][0]:null,
					attributes = _Exist(list[key][1])?list[key][1]:{},
					content = _Exist(list[key][2])?list[key][2]:[],
					events = _Exist(list[key][3])?list[key][3]:{},
					node = _Exist(result[list[key][4]])?result[list[key][4]]:(_Exist(list[key][4])?list[key][4]:null);
				if (type!=null) result[key] = this._CreateElement(type,attributes,content,events,node);
				}
			return result;
			},
		_CreateElement: function(type,attributes,content,events,node){
			if (_Exist(type)&&type!=null){
				attributes = _Exist(attributes)?attributes:{};
				content = _Exist(content)?content:[];
				events = _Exist(events)?events:{};
				node = _Exist(node)?node:null;
				var result = document.createElement(type);
				for (var key in attributes){
					if (_Type(attributes[key])!='Boolean') result.setAttribute(key,attributes[key]);
					else if (attributes[key]==true) result.setAttribute(key,key.toString());
					}
				for (var key in events){
					this._addEvent(result,key,events[key][0],events[key][1]);
					}
				for (var i=0; i<content.length; i++){
					if (_Type(content[i])==='Object') result.appendChild(content[i]);
					else result.textContent+= content[i];
					}
				if (node!=null) node.appendChild(result);
				return result;
				}
			else return null;
			},
		// IU._addEvent(obj: objet,type: eventype,fn: function,par: parameter);
		// function fn(e,par) {alert('result : ' + this.value+e.type+par);}
		// this = obj, e = event
		// ex : IU._addEvent(result,'click',test,"2");
		_addEvent: function(obj,type,fn,par){
			var funcName = function(event){return fn.call(obj,event,par);};
			obj.addEventListener(type,funcName,false);
			if (!obj.BWEListeners) {obj.BWEListeners = {};}
			if (!obj.BWEListeners[type]) obj.BWEListeners[type]={};
			obj.BWEListeners[type][fn.name]=funcName;
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
		"sAskRAZ":["Voulez vous effacer la totalité des données ?","Want to erase all the data?","Chcesz usunąć wszystkie dane?"],
		"sHead1":[["Date","Nom","Réussite(%)","Espions","LOL","Population","Sang"],
				["Date","Name","Success(%)","Spies","Lgo","Population","Blood"],
				["Data","Imię","Sukcesu(%)","Szpiedzy","PLN","Ludzie","Krew"]],
		"sHead2":[["Date","Nom","Zone","AE","MC","BO","PP","MR","AP","GA","TF","UR","MP","QL","HÔ","CI","BS","CA","AR","MN","AT"],
				["Date","Name","Area","EA","BR","SH","PS","VS","BA","GA","AS","SU","PA","DN","HO","GY","BB","CH","AR","OM","TC"],
				["Data","Imię","Strefa","PO","DP","RZ","PP","SB","AO","GA","HB","PT","LO","DL","SZ","CM","BK","KA","ZB","SR","PT"]],
		"sTriAdrTest":["([0-9]+)\\/([0-9]+)\\/([0-9]+)"],
		// chaines pour l'espionnage
		"sSpyTime":["timeFields\\.$1 = ([0-9]+)"],
		"sMidMsg":["a=msg&do=view&mid=([0-9]+)"],
		"sSpyMsg": ["Rapport de l`opération - cible: (.+)\\.",
				"Spy report - target: (.+)\\.",
				"Raport szpiegowski - cel: (.+)\\."],
		"sSpyTest0":["<br>Cible de l`espionnage: <a class=\"players\" href=\"\\?a=profile&amp;uid=([0-9]+)\"><b>([^<>]+)<\\/b><\\/a>",
				"<br>Target: <a class=\"players\" href=\"\\?a=profile&amp;uid=([0-9]+)\"><b>([^<>]+)<\\/b><\\/a>",
				"<br>Cel szpiegowania: <a class=\"players\" href=\"\\?a=profile&amp;uid=([0-9]+)\"><b>([^<>]+)<\\/b><\\/a>"],
		"sSpyTest1":["<br>Territoire: <a href=\"\\?a=townview&amp;strefa=([0-9]+)&amp;sektor=([0-9]+)\">([^<>]+)<\\/a>",
				"<br>Territory: <a href=\"\\?a=townview&amp;strefa=([0-9]+)&amp;sektor=([0-9]+)\">([^<>]+)<\\/a>",
				"<br>Teren: <a href=\"\\?a=townview&amp;strefa=([0-9]+)&amp;sektor=([0-9]+)\">([^<>]+)<\\/a>"],
		"sSpyTest2":["<br>Ordres: <b>([^<>]+)<\\/b><br>Le nombre d`espions: <b>([0-9]+)<\\/b><br>Chances de réussite: <b>([^<>]+) %</b><br><br><b>([^<>]+)<\\/b>",
				"<br>Orders: <b>([^<>]+)<\\/b><br>Number of spies: <b>([0-9]+)<\\/b><br>Chance of success: <b>([^<>]+) %</b><br><br><b>([^<>]+)<\\/b>",
				"<br>Rozkazy: <b>([^<>]+)<\\/b><br>Ilość szpiegów: <b>([0-9]+)<\\/b><br>Szanse powodzenia: <b>([^<>]+) %</b><br><br><b>([^<>]+)<\\/b>"],
		"sSpyTest3":["<br><u>Les renseignements obtenus<\\/u><br>NOM: <b>([^<>]+)<\\/b><br>RACE: <b>([^<>]+)<\\/b><br>SEXE: <b>([^<>]+)<\\/b><br><br>Niveau: <b>([0-9]+)<\\/b><br>Pts DE VIE: <b>([0-9]+) / ([0-9]+)<\\/b><br>Pts DE SANG: <b>([0-9]+) / ([0-9]+)<\\/b><br>Argent: <b>([0-9 ]+) LOL</b><br>Population: <b>([0-9 ]+)<\\/b><br>Sang: <b>([0-9 ]+)<\\/b>",
				"<br><u>Acquired information<\\/u><br>NAME: <b>([^<>]+)<\\/b><br>RACE: <b>([^<>]+)<\\/b><br>SEX: <b>([^<>]+)<\\/b><br><br>Level: <b>([0-9]+)<\\/b><br>HIT POINTS: <b>([0-9]+) / ([0-9]+)<\\/b><br>BLOOD POINTS: <b>([0-9]+) / ([0-9]+)<\\/b><br>Money: <b>([0-9 ]+) Lgo</b><br>People: <b>([0-9 ]+)<\\/b><br>Blood: <b>([0-9 ]+)<\\/b>",
				"<br><u>Zdobyte informacje<\\/u><br>IMIĘ: <b>([^<>]+)<\\/b><br>RASA: <b>([^<>]+)<\\/b><br>PŁEĆ: <b>([^<>]+)<\\/b><br><br>Poziom: <b>([0-9]+)<\\/b><br>PKT\\. ŻYCIA: <b>([0-9]+) / ([0-9]+)<\\/b><br>PKT\\. KRWI: <b>([0-9]+) / ([0-9]+)<\\/b><br>Pieniądze: <b>([0-9 ]+) PLN</b><br>Ludzie: <b>([0-9 ]+)<\\/b><br>Krew: <b>([0-9 ]+)<\\/b>"],
		"sSpyTest4":["Les niveaux des bâtiments:","Buildings` levels:","Poziomy budynków:"],
		"sSpyBat":["<br>$1: <b>([0-9]+)<\\/b>"],
		"sBats":[["AGENCE D`EMPLOI","MAISON CLOSE","BOUCHERIE","POSTE DE POLICE","MAISON DE REFUGE","AGENCE DE PROTECTION","GARNISON","TRAFIQUANT D`ARMES","URGENCES","MONT DE PIÉTÉ","QUOTIDIEN LOCAL \"DANSE MACABRE\"","HÔPITAL","CIMETIÈRE","BANQUE DE SANG","CATHÉDRALE","ARMURERIE","MARCHÉ NOIR","ARRÊT TAXI"],
				["EMPLOYMENT AGENCY","BROTHEL","SLAUGHTERHOUSE","POLICE STATION","VAGRANTS` SHELTER","BODYGUARD AGENCY","GARRISON","ARM SHOP","SURGERY","PAWNSHOP","DAILY NEWSPAPER `NIGHTSHIFT`","HOSPITAL","GRAVEYARD","BLOOD BANK","CHURCH","ARMOURY","OLD MARKET","TAXICAB"],
				["POŚREDNIAK","DOM PUBLICZNY","RZEŹNIA","POSTERUNEK POLICJI","SCHRONISKO DLA BEZDOMNYCH","AGENCJA OCHRONY","GARNIZON","HANDLARZ BRONIĄ","POGOTOWIE","LOMBARD","DZIENNIK LOKALNY \"NOCNA ZMIANA\"","SZPITAL","CMENTARZ","BANK KRWI","KATEDRA","ZBROJOWNIA","STARY RYNEK","POSTÓJ TAXI"]],
		"sSpyOk":
			["L`opération s`est terminée par un succès!","Your spies succeeded!","Operacja zakończona sukcesem!"],
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
			var result = locStr[key];
			if (!_Exist(result)) throw new Error("L::Error:: la clé n'existe pas : "+key);
			if (_Exist(result[langue])) result = result[langue];
			else result = result[0];
			for (var i=arguments.length-1;i>=1;i--){
				var reg = new RegExp("\\$"+i,"g");
				result = result.replace(reg,arguments[i]);
				}
			return result;
			}
		};
	})();

/******************************************************
* OBJET DATAS - Fonctions d'accès aux données de la page
* Chaque fonction retourne 'null' en cas d'échec
******************************************************/
var DATAS = (function(){
	// pour _Time()
	var timeDiff = null,
		stTime = new Date(),
		result = DOM._GetFirstNodeInnerHTML("/html/body/script",null),
		result2 = /var timeDiff = ([0-9]+) - Math\.floor\(stTime\.getTime\(\)\/1000\) \+ ([0-9]+) \+ stTime\.getTimezoneOffset\(\)\*60;/.exec(result);
	if (result2!=null) timeDiff = parseInt(result2[1]) - Math.floor(stTime.getTime()/1000) + parseInt(result2[2]) + stTime.getTimezoneOffset()*60;
	return {
	/* données du serveur */
		_Time: function(){
			var stTime = new Date();
			if (timeDiff!=null)	stTime.setTime((timeDiff*1000)+stTime.getTime());
			else stTime=null;
			return stTime;
			},
	/* données du joueur */
		_PlayerName: function(){
			var playerName = DOM._GetFirstNodeTextContent("//div[@class='stats-player']/a[@class='me']", null);
			return playerName;
			},
	/* Données diverses	*/
		_GetPage: function(){
			var page = 'null',
			// message Serveur (à approfondir)
				result = DOM._GetFirstNode("//div[@class='komunikat']");
			if (result!=null){
				var result = DOM._GetFirstNodeTextContent(".//u",result);
				if (result == L._Get('sDeconnecte')) page="pServerDeco";
				else if (result == L._Get('sCourtePause')) page="pServerUpdate";
				else page="pServerOther";
				}
			else{
				var qsA = DOM._QueryString("a"),
					qsDo = DOM._QueryString("do"),
					qsMid = DOM._QueryString("mid"),
					path = window.location.pathname;
				// page extérieur
				if (path!="/"){
					if (path=="/showmsg.php"&&qsA==null&&qsMid!=null) page="pShowMsg";
					else if (path=="/showmsg.php"&&qsA=="profile") page="pShowProfile";
					else if (path=="/test_items.php") page="pShowItems";
					else page="pShowOther";
					}
				// page interne
				// Profile
				else if (qsA=="profile"){
					var qsUid = DOM._QueryString("uid");
					var qsEdit = DOM._QueryString("edit");
					if (qsUid==null) page="pOProfile";
					else if (!!qsEdit) page="pOProfileEdit";
					else page="pProfile";
					}
				// Version
				else if (qsA=="changelog") page="PChangelog";
				// Premium
				else if (qsA=="premium"){
					if (qsDo==null||qsDo=="prolong") page="pProlongPremium";
					else if (qsDo=="services") page="pServicesPremium";
					else if (qsDo=="history") page="pHistoryPremium";
					}
				// Salle du Trône
				else if (qsA==null||qsA=="main") page="pMain";
				// Entrainement
				else if (qsA=="training") page="pTraining";
				// Site de construction
				else if (qsA=="build") page="pBuild";
				// Vue sur la Cité
				else if (qsA=="townview") page="pTownview";
				// Clan
				else if (qsA=="aliance"){
					if (qsDo=="list") page="pAlianceList";
					else if (qsDo=="newclan") page="pNewAliance"; // créér
					else if (qsDo=="apply") page="pApplyAliance"; // joindre
					else if (qsDo=="editclan") page="pEditAliance";
					else if (qsDo=="applies") page="pAppliesAliance";
					else if (qsDo==null||qsDo=="leave") page="pOAliance";
					else if (qsDo=="view"){
						var result = DOM._GetFirstNode("//div[@class='top-options']/span[@class='lnk']");
						if (result!=null) page="pOAliance";
						else page="pAliance";
						}
					} 
				// Demeure du Clan
				else if (qsA=="clanbld") page = "pClanbld";
				// Magasin
				else if (qsA=="townshop") page="pTownshop";
				// Souvenir
				else if (qsA=="sshop") page = "pSshop";
				// Armurerie
				else if (qsA=="equip") page="pEquip";
				// Commerce
				else if (qsA=="trade"){
					if (qsDo==null) page="pTrade";
					else if (qsDo=="newtrade") page="pNewtrade";
					else if (qsDo=="tradelog") page="pTradelog";
					}
				// Enchères - Moria I
				else if (qsA=="auction"){
					if (qsDo==null||qsDo=="watched") page="pAuctionWatched";
					else if (qsDo=="new") page="pAuctionNew";
					else if (qsDo=="itemlist") page="pAuctionItemList";
					else if (qsDo=="closed") page="pAuctionClosed";
					}
				// Le Puits des Âmes - Moria I
				else if (qsA=="mixer"){
					if (qsDo==null||qsDo=="mkstone") page="pMkstone";
					else if (qsDo=="upgitem") page="pUpgitem";
					else if (qsDo=="mixitem") page="pMixitem";
					else if (qsDo=="destitem") page="pDestitem";
					else if (qsDo=="tatoo") page="pTatoo";
					}
				// Préparer une embuscade
				else if (qsA=="ambush"){
					var qsOpt = DOM._QueryString("opt");
					if (qsOpt==null) page="pAmbushRoot";
					else if (qsOpt=="spy") page="pAmbushSpy";
					else if (qsOpt=="atk") page="pAmbushAtk";
					else if (qsOpt=="ambush") page="pAmbush";
					}
				// Quêtes
				else if (qsA=="quest"){
					var qbsel = DOM._QueryString("qbsel");
					if (qbsel==true) page="pQuestSel";
					else if (DOM._GetFirstNode("//*[@id='quest_timeleft']") != null) page="pQuestProgress";
					else page="pQuestLaunch";
					}
				// Expéditions
				else if (qsA=="cevent"){
					var currentExpe = DOM._GetFirstNode("//td[@class='ambinprogress']")!= null;
					if ((qsDo==null&&currentExpe)||qsDo=="current") page="pCurrentExpe";
					else if ((qsDo==null&&!currentExpe)||qsDo=="new") page="pNewExpe";
					else if (qsDo=="sacrifice") page="pSacrificeExpe";
					}
				// Roi de la Colline
				else if (qsA=="swr"){
					var currentExpe = DOM._GetFirstNode("//td[@class='ambinprogress']")!= null;
					if ((qsDo==null&&currentExpe)||qsDo=="current") page="pCurrentSwr";
					else if ((qsDo==null&&!currentExpe)||qsDo=="new") page="pNewSwr";
					else if (qsDo=="enchant") page="pEnchantSwr";
					}
				// Page L’Arène
				else if (qsA=="newarena") page="pArena";
				// Page Missions
				else if (qsA=="tasks") page="pTasks";
				// Page des messages
				else if (qsA=="msg"){
					var qsType = DOM._QueryString("type");
					if (qsDo==null||qsDo=="list"){
						if (qsType==null||qsType=="1") page="pMsgList";
						else if (qsType=="2") page="pMsgSaveList";
						else if (qsType=="3") page="pMsgSendList";
						}
					else if (qsDo=="clanmsg") page="pMsgClan";
					else if (qsDo=="write") page="pMsgWrite";
					else if (qsDo=="fl") page="pMsgFriendList";
					else if (qsDo=="view" && qsMid!=null){
						if (qsType==null||qsType=="1") page="pMsg";
						else if (qsType=="2") page="pMsgSave";
						else if (qsType=="3") page="pMsgSend";
						}
					}
				// Page Notes
				else if (qsA=="notes") page="pNotes";
				// Page Classement
				else if (qsA=="rank") page="pRank";
				// Page Préférences
				else if (qsA=="settings"){
					if (qsDo==null) page="pRootSettings";
					else if (qsDo=="ai") page="pSettingsAi";
					else if (qsDo=="acc") page="pSettingsAcc";
					else if (qsDo=="vac") page="pSettingsVac";
					else if (qsDo=="delchar") page="pSettingsDelchar";
					}
				// Page Rapporter à l`opérateur
				else if (qsA=="report") page="pReport";
				// Page Copyright
				else if (qsA=="developer") page="pCopyright";
				}
			return page;
			}
		};
	})();

/******************************************************
* OBJET PREF - Gestion des préférences
******************************************************/
var PREF = (function(){
	// préfèrences par défaut
	const index = 'BWSD:O:',
		defPrefs = {'sh':1,'max':'','menu':1,'tri1':[1,0],'tri2':[1,0],'list':{}};
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
		_Set: function(key,value){
			if (ID!=null){
				prefs[key] = value;
				LS._SetVar(index+ID,prefs);
				}
			}
		};
	})();

/******************************************************
CSS
******************************************************/
function SetCSS(){
	const css = 
		".BWSDtriSelect{color:lime;}"
		+".BWSD_BodyL,.BWSD_HeadL{text-align:left;}"
		+".BWSD_BodyR,.BWSD_HeadR{text-align:right;}"
		+".BWSD_HeadL,.BWSDDel{font-weight: bold;cursor: pointer;padding: 0 3px;}"
		+".BWSD_BodyL,.BWSD_BodyR,.BWSDDel{border-right:0;border-left:0;border-top:thin solid black;border-bottom:thin solid black;padding: 0 3px;color: black;}"
		+".BWSDDel{text-align:center;border:thin solid black;width:3em;color:white;background-color:red}"
		+".BWSDBut,.BWSDButError{height:10px;margin:2px 0px;}"
		+".BWSDButError{background-color:red;}",
		head = DOM._GetFirstNode("//head");
	if (head!=null) IU._CreateElement('style',{'type':'text/css'},[css],{},head);
	}

/******************************************************
* FUNCTIONS
******************************************************/
function showIU(){
	var show = PREF._Get('sh')==1?0:1;
	PREF._Set('sh',show);
	nodesIU['divIU'].setAttribute('style','display:'+(show==1?'block;':'none;'));
	}
function clickMenu(e,i){ // i= menu
	PREF._Set('menu',i);
	updateTable();
	}
function clickCol(e,i){ // i= col
	var menu = PREF._Get('menu'),
		tri = PREF._Get('tri'+menu);
	tri[1] = (i==tri[0]&&tri[1]==1)?0:1;
	tri[0] = i;
	PREF._Set('tri'+menu,tri);
	updateTable();
	}
function spyRAZ(){
	var answer = confirm(L._Get("sAskRAZ"));
	if (answer){
		PREF._Set('list',{});
		updateTable();
		}
	}
function spyDel(e,i){
	var log = PREF._Get('list');
	delete log[i];
	PREF._Set('list',log);
	updateTable();
	}
function inputNumber(e){
	var value = e.target.value,
		result = new RegExp("^(|(?:[0-9]+|[0-9]*[.]?[0-9]+))$").exec(value);
	if (result!=null){
		e.target.setAttribute('class','BWSDBut');
		PREF._Set('max',value);
		updateTable();
		}
	else e.target.setAttribute('class','BWSDButError');
	}
function updateTable(){
	var menu = PREF._Get('menu'),
		listS = PREF._Get('list'),
		list2 = [],
		tri = PREF._Get('tri'+menu);
	//créé le tableau pour tri ultérieur
	for (var key in listS){//key:[msgId,time,spyInfo]
		var info = listS[key][2]!=null?listS[key][2]:[0,null,[],[],[]], //[type,iud,result,res,bat]
			col = [listS[key][1],key];
		if (menu==1) col = col.concat((info[2][2]?info[2][2]:''),(info[2][1]?info[2][1]:''),(info[3][0]?info[3][0]:''),(info[3][1]?info[3][1]:''),(info[3][2]?info[3][2]:''));
		else{
			col.push(info[2][0]?info[2][0]:'');
			for (var i=0;i<L._Get('sBats').length;i++){col.push(info[4][i]?info[4][i]:'');}
			}
		list2.push([info[0],info[1],col]);//[type,iud,col];
		}
	// tri du tableau suivant la colonne sélectionnée
	list2.sort(function(a,b){
		var x = a[2][tri[0]-1].toString().toUpperCase(),
			y = b[2][tri[0]-1].toString().toUpperCase();
		if (menu==2&&tri[0]==3){// colonne "adresse"
			var result = new RegExp(L._Get('sTriAdrTest')).exec(x),
				result2 = new RegExp(L._Get('sTriAdrTest')).exec(y);
			if (result!=null) x = parseInt(result[1])*100000+parseInt(result[2])*100+parseInt(result[3]);
			if (result!=null) y = parseInt(result2[1])*100000+parseInt(result2[2])*100+parseInt(result2[3]);
			}
		else if (tri[0]!=2){
			x = parseFloat(x.replace(/ /g,''));
			y = parseFloat(y.replace(/ /g,''));
			if(isNaN(x)==true) x=-1;
			if(isNaN(y)==true) y=-1;
			}
		return x<y?-1:x==y?0:1;
		});
	if (tri[1]==0) list2.reverse();
	// affiche le résultat
	nodesIU['theadS'].textContent = '';
	var max = PREF._Get('max'),
		titles = menu==1?L._Get('sHead1'):L._Get('sHead2'),
		head1 = IU._CreateElements({
		'trS00':['tr',{'class':'BWEbold'},,,nodesIU['theadS']],
		'tdS001':['td',{'colspan':2},[],,'trS00'],
		's1':['a',{'href':'#','onclick':'return false;','class':(menu==1?'active':'')},[L._Get('sRes')],{'click':[clickMenu,1]},'tdS001'],'s2':['span',,[' | '],,'tdS001'],
		's3':['a',{'href':'#','onclick':'return false;','class':(menu==2?'active':'')},[L._Get('sBat')],{'click':[clickMenu,2]},'tdS001'],
		'tdS002':['td',{'class':'BWSD_HeadR','colspan':(titles.length-2)},[],,'trS00'],
		'span01':['span',,[L._Get('sReportMax')],,'tdS002'],
		'span02':['input',{'type':'text','class':'BWSDBut','value':max,'size':'2','maxlength':'2'},,{'change':[inputNumber]},'tdS002'],
		'span03':['span',{'class':'BWSD_HeadL'},[("/ "+Object.keys(listS).length)],,'tdS002'],
		'tdS003':['th',{'class':'BWSDDel'},[L._Get('sRAZ')],{'click':[spyRAZ]},'trS00'],
		'trS01':['tr',{'id':'BWSD_Head','class':'tblheader'},,,nodesIU['theadS']]
		});
	for (var i=0;i<titles.length;i++){
		var th = IU._CreateElement('th',{'class':'BWSD_HeadL'},[titles[i]],{'click':[clickCol,i+1]},head1['trS01']);
		if (menu==2&&i>2){
			th.setAttribute('onmouseout','nd();');
			th.setAttribute('onmouseover',"return overlib('"+L._Get("sBats")[i-3]+"',HAUTO,WRAP);");
			}
		}
	IU._CreateElement('th',{},[],{},head1['trS01']);
	nodesIU['tbodyS'].textContent = '';
	for (var i=0;(i<list2.length&&i<(max==''?list2.length:max));i++){
		var tr = IU._CreateElement('tr',{'style':'background-color:'+(list2[i][0]==1?'Green':list2[i][0]==-1?'Red':'white')},[],{},nodesIU['tbodyS']);
		for (var j=0;j<list2[i][2].length;j++){
			var value = j==0?(new Date(list2[i][2][0])).toLocaleDateString():j==1?'':list2[i][2][j],
				td = IU._CreateElement('td',{'class':'BWSD_BodyL'},[value],{},tr);
			if (j==1) IU._CreateElement('a',(list2[i][1]!=null?{'href':'?a=profile&uid='+list2[i][1]}:{}),[list2[i][2][1].truncate(15)],{},td);
			}
		IU._CreateElement('td',{'class':'BWSDDel'},['X'],{'click':[spyDel,list2[i][2][1]]},tr);
		}
	var newCol = DOM._GetFirstNode("./th["+tri[0]+"]",head1['trS01']);
	IU._CreateElement('span',{'class':'BWSDtriSelect'},[(tri[1]==1?"▲":"▼")],{},newCol);
	}
function updateLogS(player,msgId,msgTime,spyInfo){
	var log = PREF._Get('list');
	msgTime = (_Type(msgTime)=='Date')?msgTime.getTime():null;
	if (_Exist(log[player])){
		if (msgId!=log[player][0]){
			if ((msgTime!=null)&&(msgTime>log[player][1])) log[player] = [msgId,msgTime,spyInfo];
			}
		else if (spyInfo!=null) log[player][2] = spyInfo;
		}
	else if (msgTime!=null) log[player] = [msgId,msgTime,spyInfo];
	PREF._Set('list',log);
	}

/******************************************************
* START
* 
******************************************************/
// vérification des services
if (!JSON) throw new Error("Erreur : le service JSON n\'est pas disponible.");
else if (!window.localStorage) throw new Error("Erreur : le service localStorage n\'est pas disponible.");
else{
	var page = DATAS._GetPage(),
		player = DATAS._PlayerName(),
		IDs = LS._GetVar('BWSD:IDS',{});
console.debug('BWSDpage :',page);
	// Pages gérées par le script
	if (['null','pShowProfile','pShowMsg','pShowOther','pShowItems','pServerDeco','pServerUpdate','pServerOther'].indexOf(page)==-1&&player!=null){
console.debug('BWSDstart: %o %o',player,IDs);
		// Salle du Trône
		if (page=='pMain'){
			var result = DOM._GetFirstNodeTextContent("//div[@class='throne-maindiv']/div/span[@class='reflink']",null);
			if (result!=null){
				var result2 = /r\.php\?r=([0-9]+)/.exec(result),
					ID = _Exist(result2[1])?result2[1]:null;
				if (ID!=null){
					for (var i in IDs) if (IDs[i]==ID) delete IDs[i]; // en cas de changement de nom
					IDs[player] = ID;
					LS._SetVar('BWSD:IDS',IDs);
					}
				}
			}
		// Autre pages nécessitant l'ID
		if (_Exist(IDs[player])){
			var ID = IDs[player];
			PREF._Init(ID);
			SetCSS();
			if (page=='pMsgList'||page=='pMsgSaveList'){
				var list = DOM._GetNodes("//div[@id='content-mid']//tr[@class='tblheader']/following-sibling::tr");
				for (var i=0;i<list.snapshotLength;i++){
					var node = list.snapshotItem(i),
						msg = DOM._GetFirstNodeTextContent(".//td[2]/a[@class='msg-link']",null,node),
						msgDate = DOM._GetFirstNodeTextContent(".//td[4]",null,node),
						msgId = DOM._GetFirstNode(".//td[1]/input",node);
					// conversion au format Date
					var value = new RegExp("([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})").exec(msgDate);
						msgDate = (value!=null)?new Date(value[1],value[2]-1,value[3],value[4],value[5],value[6]):null;
					if (msg!=null&&msgDate!=null&&msgId!=null){
						var msgId = msgId.getAttribute('id').replace('msgid_',''),
							m1 = new RegExp(L._Get('sSpyMsg')).exec(msg);
						// messages d'espionnage ?
						if (m1!=null) updateLogS(m1[1],msgId,msgDate,null);
						}
					}
				}
			else if (page=='pMsg'||page=='pMsgSave'){
				var t = DOM._GetFirstNodeInnerHTML("//div[@class='msg-content ']", null);
				if (t!=null){
					var result = new RegExp(L._Get('sSpyTest0')).exec(t),
						result1 = new RegExp(L._Get('sSpyTest1')).exec(t),
						result2 = new RegExp(L._Get('sSpyTest2')).exec(t),
						result3 = new RegExp(L._Get('sSpyTest3')).exec(t),
						result4 = new RegExp(L._Get('sSpyTest4')).exec(t),
						qsMid = DOM._QueryString("mid");
					if (result!=null){// rapport d'espionnage
						var spyInfo = [0,result[1],[],[],[]];//[type,iud,result,res,bat]
						if (result2!=null&&result1!=null){
							spyInfo[0] = result2[4]==L._Get('sSpyOk')?1:-1;
							spyInfo[2] = [result1[3].replace(/ /g,''),Number(result2[2]),result2[3]];//[zone,espions,%]
							}
						if (result3!=null){
							spyInfo[3] = [result3[9],result3[10],result3[11]];//[LOL,pop,sang]
							}
						if (result4!=null){// batiments
							for (var i=0;i<L._Get('sBats').length;i++){
								var bats = new RegExp(L._Get('sSpyBat',L._Get('sBats')[i])).exec(t);
								spyInfo[4][i] = bats!=null?Number(bats[1]):0;
								}
							}
						updateLogS(result[2],qsMid,null,spyInfo);
						}
					}
				}
			else if (page=='pAmbushRoot'){
				var spyaction = DOM._GetNodes("//div[@id='content-mid']//tr/td/span[@class='spyinprogress']");
				for (var i=0;i<spyaction.snapshotLength;i++){
					var node = spyaction.snapshotItem(i),
						spyId = node.getAttribute('id'),
						spyScript = DOM._GetFirstNodeInnerHTML("./parent::td/script",null,node);
					if (spyScript!=null){
						var result = new RegExp(L._Get('sSpyTime',spyId)).exec(spyScript),
							result2 = new RegExp(L._Get('sMidMsg')).exec(spyScript),
							playerVS = DOM._GetFirstNodeTextContent("./parent::td/parent::tr/td/a[@class='players']",null,node),
							msgDate = DATAS._Time();
						if (msgDate!=null&&result!=null&&result2!=null&&playerVS!=null){
							msgDate.setTime(msgDate.getTime()+result[1]*1000);
							updateLogS(playerVS,result2[1],msgDate,null);
							}
						}
					}
				}
			// init IU
			var nodesIU,
				nodeOptions = DOM._GetFirstNode("//div[@class='remark']"),
				contentMid = DOM._GetFirstNode("//div[@id='content-mid']"),
				contentMidChild = DOM._GetFirstNode("//div[@id='content-mid']/*");
			if (nodeOptions!=null&&contentMidChild!=null){
				var titleMenuIU = {
					'1':['a',{'class':'remark','target':'_blank','href':'#','onclick':'return false;'},[L._Get('sTitle')],{'click':[showIU]}],
					'2':['span',,[' | ']]},
					nodeTitle = IU._CreateElements(titleMenuIU);
				nodeOptions.insertBefore(nodeTitle['2'],nodeOptions.firstChild);
				nodeOptions.insertBefore(nodeTitle['1'],nodeOptions.firstChild);
				var elementsIU = {
					'divIU':['div',{'id':'BWSD','style':'display:'+(PREF._Get('sh')==1?'block;':'none;')}],
					'fieldset':['fieldset',{'class':'equip'},,,'divIU'],
					'legend':['legend',{'class':'arcane-header'},,,'fieldset'],
					'l1':['span',,[L._Get('sTitle')+' '],,'legend'],
					'l2':['a',{'target':'_blank','href':'https://github.com/Ecilam/BloodWarsSpyData'},[(typeof(GM_info)=='object'?GM_info.script.version:'?')],,'legend'],
					'tableS':['table',{'style':'border-collapse:collapse;width:100%'},,,'fieldset'],
					'theadS':['thead',,,,'tableS'],
					'tbodyS':['tbody',{'id':'BWSD_Body'},,,'tableS'],
					'br':['br',,,,'divIU'],
					};
				nodesIU = IU._CreateElements(elementsIU);
				contentMid.insertBefore(nodesIU['divIU'],contentMidChild);
				updateTable();
				}
			}
		else alert(L._Get("sUnknowID"));
		}
	}
console.debug('BWSDEnd');
})();
