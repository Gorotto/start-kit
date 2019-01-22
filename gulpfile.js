'use strict';

// Определим константу с папками
const dirs = {
  source: 'src',  // папка с исходниками (путь от корня проекта)
  build: 'build', // папка с результатом работы (путь от корня проекта)
};

// Определим необходимые инструменты
const gulp = require('gulp');
const gulpSequence = require('gulp-sequence');
const extender = require('gulp-html-extend');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const objectFitImages = require('postcss-object-fit-images');
const replace = require('gulp-replace');
const del = require('del');
const browserSync = require('browser-sync').create();
const ghPages = require('gulp-gh-pages');
const newer = require('gulp-newer');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const cheerio = require('gulp-cheerio');
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const base64 = require('gulp-base64');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const cleanCSS = require('gulp-cleancss');
const pug = require('gulp-pug');
const spritesmith = require('gulp.spritesmith');
const buffer = require('vinyl-buffer');
const merge = require('merge-stream');
const wait = require('gulp-wait');
const htmlbeautify = require('gulp-html-beautify');

// Перечисление и настройки плагинов postCSS, которыми обрабатываются стилевые файлы
let postCssPlugins = [
  autoprefixer({                                           // автопрефиксирование
    browsers: ['last 2 version']
  }),
  mqpacker({                                               // объединение медиавыражений с последующей их сортировкой
    sort: true
  }),
  objectFitImages(),                                       // возможность применять object-fit
];

// Изображения, которые нужно копировать
let images = [
  dirs.source + '/img/*.{gif,png,jpg,jpeg,svg,ico}',
  dirs.source + '/img/**/*.{gif,png,jpg,jpeg,svg,ico}',
  dirs.source + '/blocks/**/img/*.{gif,png,jpg,jpeg,svg}',
  '!' + dirs.source + '/blocks/sprite-png/png/*',
  '!' + dirs.source + '/blocks/sprite-svg/svg/*',
];

// Cписок обрабатываемых файлов в указанной последовательности
let jsList = [
  // './node_modules/jquery/dist/jquery.min.js',
  // './node_modules/jquery-migrate/dist/jquery-migrate.min.js',
  // './node_modules/svg4everybody/dist/svg4everybody.js',
  // './node_modules/object-fit-images/dist/ofi.js',
  dirs.source + '/js/script.js',
];
// Cписок обрабатываемых файлов в указанной последовательности
let jsLibs = [
  dirs.source + '/js-libs/jquery.js',
  dirs.source + '/js-libs/jquery-migrate.js',
  dirs.source + '/js-libs/svg4everybody.js',
  dirs.source + '/js-libs/ofi.js',
  // dirs.source + '/js-libs/owl.carousel.js',
  // dirs.source + '/js-libs/jquery.parallax.js',
];
// Cписок css-libs
gulp.task('css-libs', function () { // Создаем таск css-libs

    return gulp.src(dirs.source + '/css-libs/*.css') // Берем источник
      .pipe(postcss(postCssPlugins))// сжымаем
      .pipe(concat('libs.min.css'))                        // объеденяем в файл
      .pipe(cleanCSS())                                    // сжимаем и оптимизируем
      .pipe(gulp.dest(dirs.build + '/css/'));              // Выгружаем результата в папку app/css

});

// Компиляция и обработка стилей
gulp.task('style', function () {
  return gulp.src(dirs.source + '/scss/style.scss')        // какой файл компилировать
    .pipe(plumber({                                        // при ошибках не останавливаем автоматику сборки
      errorHandler: function(err) {
        notify.onError({
          title: 'Styles compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(wait(100))
    .pipe(sourcemaps.init())                               // инициируем карту кода
    .pipe(sass())                                          // компилируем
    .pipe(postcss(postCssPlugins))                         // делаем постпроцессинг
    .pipe(sourcemaps.write('/'))                           // записываем карту кода как отдельный файл
    .pipe(gulp.dest(dirs.build + '/css/'))                 // записываем CSS-файл

    .pipe(rename('style.min.css'))                         // переименовываем (сейчас запишем рядом то же самое, но минимизированное)
    .pipe(cleanCSS())                                      // сжимаем и оптимизируем
    .pipe(gulp.dest(dirs.build + '/css/'))                // записываем CSS-файл
    .pipe(browserSync.stream({match: '**/*.css'}));         // укажем browserSync необходимость обновить страницы в браузере
});

// Копирование и обработка HTML (ВНИМАНИЕ: при совпадении имён Pug приоритетнее!)
// gulp.task('html', function() {
//   return gulp.src(dirs.source + '/*.html')
//     .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))        // Убираем комменты для разработчиков
//     .pipe(gulp.dest(dirs.build));
// });
// gulp.task('extend-blocks', function () {
//      return   gulp.src(dirs.source + '/blocks/**/*.html')
//         .pipe(extender({annotations: true, verbose: false})) // default options
//         .pipe(gulp.dest('./'))
// });
// Компиляция pug
gulp.task('pug', function() {
  return gulp.src([
      dirs.source + '/*.pug',
      '!' + dirs.source + '/mixins.pug',
    ])
    .pipe(plumber())
    .pipe(pug())
    .pipe(htmlbeautify())
    .pipe(gulp.dest(dirs.build));
});

// Копирование изображений
gulp.task('copy:img', function () {
  if(images.length) {
    return gulp.src(images)
      // .pipe(newer(dirs.build + '/img')) // потенциально опасно, к сожалению
      .pipe(rename({dirname: ''}))
      .pipe(gulp.dest(dirs.build + '/img'));
  }
  else {
    console.log('Изображения не обрабатываются.');
    callback();
  }
});

// Копирование шрифтов
gulp.task('copy:fonts', function () {
  return gulp.src([
      dirs.source + '/fonts/*.{ttf,woff,woff2,eot,svg}',
    ])
    .pipe(gulp.dest(dirs.build + '/fonts'));
});

// Сборка SVG-спрайта
let spriteSvgPath = dirs.source + '/blocks/sprite-svg/svg/';
gulp.task('sprite:svg', function (callback) {
  if(fileExist(spriteSvgPath) !== false) {
    return gulp.src(spriteSvgPath + '*.svg')
      .pipe(svgmin(function (file) {
        return {
          plugins: [{
            cleanupIDs: {
              minify: true
            }
          }]
        }
      }))
      .pipe(svgstore({ inlineSvg: true }))
      .pipe(cheerio({
        run: function($) {
          $('svg').attr('style',  'display:none');
        },
        parserOptions: {
          xmlMode: true
        }
      }))
      .pipe(rename('sprite-svg.svg'))
      .pipe(gulp.dest(dirs.source + '/blocks/sprite-svg/img/'));
  }
  else {
    console.log('SVG-спрайт: нет папки ' + spriteSvgPath);
    callback();
  }
});

// Сборка PNG-спрайта
let spritePngPath = dirs.source + '/blocks/sprite-png/png/';
gulp.task('sprite:png', function () {
  del(dirs.srcPath + dirs.blocksDirName + '/sprite-png/img/*.png');
  let fileName = 'sprite-' + Math.random().toString().replace(/[^0-9]/g, '') + '.png';
  let spriteData = gulp.src(spritePngPath + '*.png')
    // .pipe(plumber({
    //   errorHandler: function(err) {
    //     notify.onError({
    //       title: 'Png sprite error',
    //       message: err.message
    //     })(err);
    //     this.emit('end');
    //   }
    // }))
    .pipe(spritesmith({
      imgName: fileName,
      cssName: 'sprite-png.scss',
      padding: 4,
      imgPath: '../img/' + fileName
    }));
  let imgStream = spriteData.img
    .pipe(buffer())
    .pipe(imagemin())
    .pipe(gulp.dest(dirs.source + '/blocks/sprite-png/img/'));
  let cssStream = spriteData.css
    .pipe(gulp.dest(dirs.source + '/blocks/sprite-png/'));
  return merge(imgStream, cssStream);
});


// Ручная оптимизация изображений
// Использование: folder=src/img npm start img:opt
const folder = process.env.folder;
gulp.task('img:opt', function (callback) {
  const imagemin = require('gulp-imagemin');
  // const pngquant = require('imagemin-pngquant');
  if(folder){
    console.log('---------- Оптимизация картинок');
    return gulp.src(folder + '/*.{jpg,jpeg,gif,png,svg}')
      .pipe(imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.jpegtran({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [
            { removeViewBox: false },
            { cleanupIDs: false }
          ]
        })
      ]))
      .pipe(gulp.dest(folder));
  }
  else {
    console.log('---------- Оптимизация картинок: ошибка (не указана папка)');
    console.log('---------- Пример вызова команды: folder=src/blocks/block-name/img npm start img:opt');
    callback();
  }
});


// Очистка перед сборкой
gulp.task('clean', function () {
  return del([
    dirs.build + '/**/*',
    '!' + dirs.build + '/readme.md',
    dirs.source + '/blocks/sprite-png/img',

  ]);
});

// Конкатенация и углификация Javascript
gulp.task('js', function (callback) {
  if(jsList.length) {
    return gulp.src(jsList)
      .pipe(plumber({
        errorHandler: function(err) {
          notify.onError({
            title: 'Javascript concat/uglify error',
            message: err.message
          })(err);
          this.emit('end');
        }
      }))            // не останавливаем автоматику при ошибках
      .pipe(concat('script.min.js'))                        // конкатенируем все файлы в один с указанным именем
      .pipe(uglify())                                       // сжимаем
      .pipe(gulp.dest(dirs.build + '/js'));                 // записываем
  }
  else {
    callback();
  }
});

// js-libs js
gulp.task('jsl', function () {
  if(jsLibs.length) {
    return gulp.src(jsLibs)
      .pipe(plumber({
        errorHandler: function(err) {
          notify.onError({
            title: 'Javascript concat/uglify error',
            message: err.message
          })(err);
          this.emit('end');
        }
      }))              // не останавливаем автоматику при ошибках
      .pipe(concat('libs.min.js'))                        // конкатенируем все файлы в один с указанным именем
      .pipe(uglify())                                       // сжимаем
      .pipe(gulp.dest(dirs.build + '/js'));                 // записываем
  }
  else {
    console.log('Javascript не обрабатывается');
    callback();
  }
});



// Сборка всего
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('sprite:svg', 'sprite:png'),
  gulp.parallel(
    'css-libs',
    'style',
    'jsl',
    'js',
    'copy:img',
    'copy:fonts'
),
  'pug'
  // 'extend-blocks',
  // 'html'
));

// Локальный сервер, слежение
gulp.task('serve', gulp.series('build', function() {

  browserSync.init({
    server: dirs.build,
    port: 8080,
    startPath: 'index.html',
    open: false,
  });

  // Слежение за стилями
  let stylePaths = [
    dirs.source + '/scss/style.scss',
    dirs.source + '/scss/variables.scss',
    dirs.source + '/scss/elements.scss',
    dirs.source + '/scss/grid.scss',
    dirs.source + '/blocks/**/*.scss',
  ];
  gulp.watch(stylePaths, gulp.series('style'));

  gulp.watch(dirs.source + '/css-libs/*.css',
  gulp.series('css-libs', reload));

  // Слежение за html
  // gulp.watch(dirs.source + '/*.html',
  // gulp.series('html', reload));

  // Слежение за html вставкой
  // gulp.watch(dirs.source + '/**/*.html',
  // gulp.series('extend-blocks', reload));

  // Слежение за pug
  gulp.watch(dirs.source + '/**/*.pug',
  gulp.series('pug', reload));

  // Слежение за изображениями
  if(images.length) {
    gulp.watch(images, gulp.series('copy:img', reload));
  }

  // Слежение за шрифтами
  gulp.watch(dirs.source + '/fonts/*.{ttf,woff,woff2,eot,svg}',
   gulp.series('copy:fonts', reload));

  // Слежение за SVG (спрайты)
  gulp.watch('*.svg', {cwd: spriteSvgPath}, gulp.series('sprite:svg', reload));

  // Слежение за PNG (спрайты)
  if(('sprite-png') !== undefined) {
    gulp.watch('*.png', {cwd: spritePngPath}, gulp.series('sprite:png', reload));
  }
  // gulp.watch('*.png', {cwd: spritePngPath}, gulp.series('sprite:png', reload));

  // JS-файлы, которые нужно просто копировать
  if(jsList.length) {
    gulp.watch(jsList, gulp.series('js', reload));
  }

  // JS-файлы, которые нужно просто копировать
  if(jsList.length) {
    gulp.watch(jsLibs, gulp.series('jsl', reload));
  }
  //слежение за библиотеками js
  // gulp.watch([
  //   dirs.source + '/js-libs/*.js',
  // ], ['js-libs']);



}));
// Задача по умолчанию
gulp.task('default',
  gulp.series('serve')
);

// Перезагрузка браузера
function reload (done) {
  browserSync.reload();
  done();
}

// Проверка существования файла/папки
function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}





// var onError = function(err) {
//   notify.onError({
//     title: 'Error in ' + err.plugin,
//   })(err);
//   this.emit('end');
// };
