CC = emcc
CFLAGS = -O3 -Isrc-engine -Isrc-engine/lua
LDFLAGS = -s WASM=0 \
          -s TOTAL_MEMORY=33554432 \
          -s ALLOW_MEMORY_GROWTH=0 \
          -s USE_SDL=2 \
          -s DISABLE_EXCEPTION_CATCHING=1 \
          -s NO_FILESYSTEM=0 \
          -s ENVIRONMENT=web \
          -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
          -s EXPORTED_FUNCTIONS='["_main","_run_lua_string","_load_game_file"]' \
          --preload-file webapp/game@/game

SRC = src-engine/main.cpp \
      src-engine/engine_core.cpp \
      src-engine/renderer_2d.cpp \
      src-engine/renderer_25d.cpp \
      src-engine/audio.cpp \
      src-engine/lua_bindings.cpp \
      src-engine/lua/lapi.c \
      src-engine/lua/lcode.c \
      src-engine/lua/ldebug.c \
      src-engine/lua/ldo.c \
      src-engine/lua/ldump.c \
      src-engine/lua/lfunc.c \
      src-engine/lua/lgc.c \
      src-engine/lua/llex.c \
      src-engine/lua/lmem.c \
      src-engine/lua/lobject.c \
      src-engine/lua/lopcodes.c \
      src-engine/lua/lparser.c \
      src-engine/lua/lstate.c \
      src-engine/lua/lstring.c \
      src-engine/lua/ltable.c \
      src-engine/lua/ltm.c \
      src-engine/lua/lundump.c \
      src-engine/lua/lvm.c \
      src-engine/lua/lzio.c \
      src-engine/lua/lauxlib.c \
      src-engine/lua/lbaselib.c \
      src-engine/lua/ldblib.c \
      src-engine/lua/liolib.c \
      src-engine/lua/lmathlib.c \
      src-engine/lua/loslib.c \
      src-engine/lua/ltablib.c \
      src-engine/lua/lstrlib.c \
      src-engine/lua/loadlib.c \
      src-engine/lua/linit.c

OUT = dist/engine.js

all: setup_dist
	$(CC) $(SRC) $(CFLAGS) $(LDFLAGS) -o $(OUT)
	@echo "Built $(OUT) successfully for KaiOS 2.5 (asm.js)"

setup_dist:
	mkdir -p dist
	cp -r webapp/* dist/

clean:
	rm -rf dist
