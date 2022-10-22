const toggle=document.querySelector('button');
const links= document.querySelector('.links');

toggle.addEventListener('click',function(){
    links.classList.toggle('showlinks')
    console.log(links);
})