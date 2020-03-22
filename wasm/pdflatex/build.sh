# emcc -v -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s INVOKE_RUN=0 --pre-js pre.js --post-js post.js -o pdflatex.js \
#    -s MODULARIZE=1 -s EXPORT_NAME="'pdflatex'" -s EXIT_RUNTIME=1 -s EXTRA_EXPORTED_RUNTIME_METHODS='["FS", "callMain"]' -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE='["memcpy", "memset", "malloc", "free", "emscripten_get_heap_size", "$ERRNO_CODES"]' \
#    -s TOTAL_MEMORY=134217728 --preload-file resources@/ pdftex.bc

emcc -v -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s INVOKE_RUN=0 --pre-js pre.js --post-js post.js -o pdflatex.js \
    -s MODULARIZE=1 -s EXPORT_NAME="'pdflatex'" -s EXIT_RUNTIME=1 -s EXTRA_EXPORTED_RUNTIME_METHODS='["FS", "callMain"]' -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE='["memcpy", "memset", "malloc", "free", "emscripten_get_heap_size", "$ERRNO_CODES"]' \
    -s TOTAL_MEMORY=134217728 pdftex.bc

cp pdflatex.wasm ../../chrome-extension/resources/wasm
cp pdflatex.js ../../chrome-extension/resources/scripts
# cp pdflatex.data ../../chrome-extension/src/
