document.addEventListener("DOMContentLoaded", function() {
    const login = document.getElementById("loginButton")
    const create = document.getElementById("createButton")
    const user = document.getElementById("username")
    const password = document.getElementById("password")

    login.addEventListener('click', function(){
        let details = (user,password)
        login(details)
    })

    create.addEventListener('click', function(){

    })

});

function login(details) {
    const xml = new XMLHttpRequest();
    
    xml.open("GET", `/login/${details(0)}/${details(1)}`, true);

    xml.onreadystatechange = function () {
        if (xml.readyState === 4) {
            output.innerText = xml.responseText;
        }
    };
    xml.send();
}