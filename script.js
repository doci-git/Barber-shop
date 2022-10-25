const toggle = document.querySelector('button');
const links = document.querySelector('.links');

toggle.addEventListener('click', function () {
    links.classList.toggle('showlinks')
    console.log(links);
});

const dates = new Date().getFullYear();
const spanDate = document.querySelector('.date');
spanDate.innerHTML = dates;