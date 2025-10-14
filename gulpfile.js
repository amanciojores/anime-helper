const gulp = require("gulp");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");

gulp.task("minify", () => {
  return gulp
    .src("src/AnimeHelper.js")
    .pipe(uglify())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("dist"));
});

gulp.task("build", gulp.series("minify"));

gulp.task("watch", () => {
  gulp.watch("src/**/*.js", gulp.series("minify"));
});

gulp.task("default", gulp.series("build", "watch"));
