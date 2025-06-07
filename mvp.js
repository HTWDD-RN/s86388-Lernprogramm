"use strict";

document.addEventListener('DOMContentLoaded', function () {
    let model = new Model();
    let presenter = new Presenter();
    let view = new View(presenter);
    presenter.setModelAndView(model, view);
});
fetch("https://idefix.informatik.htw-dresde.de:8888/api/quizzes", {
    method: "GET",
    headers: { 
        "Authorisation": "Basic " + btoa("test@gmail.com:secret")
    }
})
.then((response) => {
    if (!response.ok) {
        throw new Error("Fehler beim Laden der Quizzes: " + response.statusText);
    }
    return response.json();
})
.then((data) => {
    console.log("Quizzes geladen:", data);
}).catch((error) => {
    console.error("Fehler beim Laden der Quizzes:", error);
});

// ############# Model ###########################################################################
//############# Todo: 1 json laden, fragen liefern und antworten überprüfen ######################
class Model {
    constructor() 
    {
        this.aufgaben=[];
        this.nr = 0;
        this.buttonerlauben = null;


        //1
        fetch("task_IT.json")
                .then((antwort) => 
                {
                    if(!antwort.ok) 
                        {throw new Error("Fehler beim Laden der JSON");}
                    return antwort.json();    
                })
                .then((data) => {this.aufgaben = data;                                    ////////////////////////////////
                    if (typeof this.buttonerlauben === "function") 
                        {this.buttonerlauben(); }
                })                             
                .catch((err) => console.error("Aufgaben laden failed! ",err));
    }

    


    // Holt eine Frage aus dem Array, zufällig ausgewählt oder vom Server                       /////////////////////////////////
    getTask(nummer) {
        if( !this.aufgaben || nummer<0 || nummer>= this.aufgaben.length)
        {return null;} ///location.href("about.html");
        
        return this.aufgaben[nummer];
        
    }

    checkAnswer(aufgabenidx,antwortidx) {
        const aufgabe = this.getTask(aufgabenidx);
        if(!aufgabe)
        {return false;}

        const richtige_antwort = typeof aufgabe.correctIndex === "number"                  //////////////////////////////////////////////////// 
                                    ? aufgabe.correctIndex
                                    : 0;
        return antwortidx === richtige_antwort;
    }
}




// ############ Controller ########################################################################
class Presenter {

    setModelAndView(model, view) {
        this.m = model;
        this.v = view;
        this.anr = 0;   //aktuelle Aufgabennr
        this.m.buttonerlauben = () =>  {this.v.enableWeiterButton();};
        this.schon_weiter_gedruckt = false;
        this.antwort_gegeben = false;
        this.richtig = 0;
        this.falsch = 0;


    }

     // Holt eine neue Frage aus dem Model und setzt die View
    setTask() {

        if(this.anr >= this.m.aufgaben.length)
        {
            this.v.showZusammenfassung(this.richtig, this.falsch, this.m.aufgaben.length);
            this.v.disableWeiterButton();
            this.v.disableAntwortButtons();
            return;
        }

        //frage aus dem Model holen
        const frag = this.m.getTask(this.anr);
        this.v.renderText(frag.task);   //task anzeigen
        

        //antworten-Buttons anzeigen
        const Auswahl = frag.answer.map((text, i) => ({text, originalIndex: i}));
                                        //Fisher-Yates Shuffle
                                        //Mit dieser Standard-Routine wird das Auswahl-Array in‐place so durchgemischt, dass jede der vier Antworten gleich wahrscheinlich an jeder Position landet.
        for(let i = Auswahl.length - 1; i > 0; i--)
        {
            const j = Math.floor(Math.random() * (i + 1)); //Fisher-Yates Shuffle
            [Auswahl[i], Auswahl[j]] = [Auswahl[j], Auswahl[i]]; //tauschen
        }

        //in zufälliger Reihenfolge die Buttons füllen
        Auswahl.forEach((ausw, i) => {
            this.v.inscribeButtons(i, ausw.text, ausw.originalIndex); //Antworten in Buttons reinpacken
        });
        

        //flags werden resettet,da man eine neue Task bekommt
        this.schon_weiter_gedruckt = false;
        this.antwort_gegeben = false;
    }

    // Prüft die Antwort, aktualisiert Statistik und setzt die View
    checkAnswer(antwortidx) {
        console.log("Presenter.checkAnswer wurde aufgerufen mit index:", antwortidx);
        //alte Rückmeldung entfernen
        this.v.clearResult();

        const frag = this.m.getTask(this.anr);
        if(!frag){return;}

        if (!this.antwort_gegeben && !this.schon_weiter_gedruckt)
        {
            const rerg = this.m.checkAnswer(this.anr, antwortidx);
            if(rerg)
            {
                this.richtig++;
                this.v.showResult("Richtig!",true);
            }
            else
            {
                this.falsch++;
                const was_richtig_ist =frag.answer[frag.correctIndex];
                this.v.showResult(`Falsch! Richtige Antwort: ${was_richtig_ist}`,false);
            }
            

            this.antwort_gegeben = true;
            this.v.disableAntwortButtons(); //Antwort-Buttons deaktivieren, damit man erst weiter drücken muss
            this.v.updateProgress(this.anr, this.m.aufgaben.length); //Fortschritt aktualisieren
        }
    }


    skipOderWeiterFrage(){
        //alte Rückmeldung entfernen
        this.v.clearResult();

        const frag = this.m.getTask(this.anr);

        if(this.anr >= this.m.aufgaben.length)  	{return;}
        
        //wenn zum ersten mal auf weiter geklickt wird, dann wird die Frage übersprungen
        if(!this.schon_weiter_gedruckt && !this.antwort_gegeben)
        {
            this.falsch++;
            const richtig_Text = frag.answer[frag.correctIndex];
            this.v.showResult(`Falsch (übersprungen)! Richtige Antwort: ${richtig_Text}`, false);
            this.schon_weiter_gedruckt = true;
            this.v.disableAntwortButtons(); //Antwort-Buttons deaktivieren
            this.v.updateProgress(this.anr, this.m.aufgaben.length);
        }
        else
        {
            //wenn schon weiter gedrückt wurde, dann wird die nächste Frage geladen
            this.schon_weiter_gedruckt = false;
            this.anr++;
            this.v.enableWeiterButton(); //weiter-Button aktivieren
            this.setTask();
        }
    }
}

// ##################### View #####################################################################
class View {
    constructor(presenter) {
        this.p = presenter; 

       let weiterbutton = document.getElementById("weiter");
        if(weiterbutton)
        {
            weiterbutton.addEventListener("click", () => {this.p.skipOderWeiterFrage();} );
           
        document.getElementById("Antwort").addEventListener("click", (ev) => {this.checkEvent(ev);} );
    
        document.getElementById("back").addEventListener("click", () => {window.location.href = "index.html";} );
        }
    }


    //Fragetext in Fragefeld einfügen
    renderText(text){
        const div = document.getElementById("Frage");
        div.innerHTML = `<p>${text}</p>`;
    }


    //Buttons mit antworten füllen
    inscribeButtons(i, text, pos) {
        const buttons = document.querySelectorAll("#Antwort button");
        buttons[i].textContent = text;
        buttons[i].setAttribute("data-number",pos);
        buttons[i].disabled = false; //Buttons aktivieren
    }

    disableAntwortButtons() {
        const buttons = document.querySelectorAll("#Antwort button").forEach((button) => {
            button.disabled = true; //Buttons deaktivieren
        });
    }

    //vorherige Ergebnis-Meldung löschen
    clearResult()
    {
        const r = document.getElementById("Ergebnis-Feedback");
        r.textContent = "";
        r.className = "";
    }

    //ergebnis-feedback anzeigen 
    showResult(feedback, rerg)
    {
        const r = document.getElementById("Ergebnis-Feedback");
        r.textContent = feedback;
        r.className = rerg? "richtig" : "falsch";
    }

    //klicks auf den Button müssen behandelt werden
    checkEvent(event) {
        if (event.target.tagName === "BUTTON") {
            const num = Number(event.target.getAttribute("data-number"));
            this.p.checkAnswer(num);
        }
    }

    enableWeiterButton() {
    const button = document.getElementById("weiter");
    button.disabled = false;
    button.classList.add("ready"); // falls man in CSS eine Klasse 'ready' definiert
  }

  disableWeiterButton() {
    const button = document.getElementById("weiter");
    button.disabled = true;
    button.classList.remove("ready");  
  }

  showZusammenfassung(richtig, falsch, gesamt) {
    //Speichern der Ergebnisse in localStorage
    localStorage.setItem("Webprichtig", richtig);
    localStorage.setItem("Webpfalsch", falsch);
    localStorage.setItem("Webpgesamt", gesamt);

    //Bodyx-Klasse für die Zusammenfassung ersetzen
    document.body.classList.add("showZusammenfassung");

    //Fragetext entfernen
    document.getElementById("Frage").style.display = "none"; //Fragefeld entfernen

    //antwortbereichs entfernen
    document.getElementById("Antwort").style.display = "none"; //Buttons entfernen

    //weiter-Button entfernen
    document.getElementById("weiter").style.display = "none"; //weiter-Button entfernen
    // Fortschrittsbalken entfernen passiert automatisch, da er im HTML nicht mehr vorhanden ist

    //Zusammenfassung anzeigen
    const zusammenfassung = document.getElementById("Ergebnis-Feedback");
    zusammenfassung.innerHTML = `
        <p> Quiz beendet!</p>
        <p> Richtig: ${richtig}</p>
        <p> Falsch: ${falsch}</p>
        <p> Gesamt beantwortet: ${gesamt}</p>
        `;
    zusammenfassung.className = ""; 
  }

  // Fortschrittsbalken aktualisieren
  updateProgress(aktuellerIndex, gesamtAnzahl) {
    const percent = ((aktuellerIndex + 1) / gesamtAnzahl) * 100;
    document.getElementById("progress-bar").style.width = percent + "%";
  }









}



