// toogle menu
const toggle = document.querySelector('button');
const links = document.querySelector('.links');

toggle.addEventListener('click', function () {
    links.classList.toggle('showlinks')
    //console.log(links);
});

// slide image 
const slides = document.querySelectorAll('.slide');
const nextBtn = document.querySelector('.nextBtn');
const prevtBtn = document.querySelector('.prevBtn');

slides.forEach(function (slide, index) {
  slide.style.left = `${index * 100 }%`;

});
let counter = 0;

nextBtn.addEventListener('click', function () {
  counter++;
  carousel();
});

prevtBtn.addEventListener('click', function () {
  counter--;
  carousel()
});


function carousel() {
  if (counter === slides.length) {
    counter = 0;
  }
  if (counter < 0) {
    counter = slides.length - 1;

  }
  slides.forEach(function (slide) {
    slide.style.transform = `translateX(-${counter * 100}%)`
  })
};

// auto date change for footer
const dates = new Date().getFullYear();
const spanDate = document.querySelector('.date');
spanDate.innerHTML = dates;