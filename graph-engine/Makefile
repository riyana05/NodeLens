# ===============================================================
#  Makefile — alternative to CMake for simple server deploys
#  Usage:
#    make           → Release build
#    make debug     → Debug build with sanitisers
#    make clean     → Remove build artefacts
#    make fetch-json → Download nlohmann/json.hpp
# ===============================================================

CXX      := g++
STD      := -std=c++17
INCLUDES := -I./include

SRCS := src/main.cpp \
        src/Dijkstra.cpp \
        src/Prim.cpp \
        src/PageRank.cpp \
        src/Community.cpp \
        src/Stability.cpp \
        src/Simulation.cpp \
        src/Forecaster.cpp

TARGET   := graph-engine

RELEASE_FLAGS := -O3 -DNDEBUG -march=native
DEBUG_FLAGS   := -g -fsanitize=address,undefined -fno-omit-frame-pointer

.PHONY: all release debug clean fetch-json

all: fetch-json release

release:
	$(CXX) $(STD) $(RELEASE_FLAGS) $(INCLUDES) $(SRCS) -o $(TARGET)
	@echo "Built $(TARGET) [release]"

debug:
	$(CXX) $(STD) $(DEBUG_FLAGS) $(INCLUDES) $(SRCS) -o $(TARGET)_debug
	@echo "Built $(TARGET)_debug [debug + sanitisers]"

fetch-json:
	@if [ ! -f include/json.hpp ]; then \
		echo "Downloading nlohmann/json.hpp..."; \
		curl -sSL \
		  https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp \
		  -o include/json.hpp && echo "Downloaded include/json.hpp"; \
	else \
		echo "include/json.hpp already present"; \
	fi

clean:
	rm -f $(TARGET) $(TARGET)_debug
	@echo "Cleaned build artefacts"

test: release
	@echo "--- F13: Trust Path ---"
	./$(TARGET) '{"nodes":[{"id":"A"},{"id":"B"},{"id":"C"}],"edges":[{"src":"A","dst":"B","weight":0.9},{"src":"B","dst":"C","weight":0.8}],"args":{"sourceId":"A","targetId":"C"}}' trust-path
	@echo ""
	@echo "--- F6: PageRank ---"
	./$(TARGET) '{"nodes":[{"id":"A"},{"id":"B"},{"id":"C"}],"edges":[{"src":"A","dst":"B","weight":0.9},{"src":"B","dst":"C","weight":0.8},{"src":"C","dst":"A","weight":0.7}]}' pagerank
	@echo ""
	@echo "--- F7: Backbone MST ---"
	./$(TARGET) '{"nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"}],"edges":[{"src":"A","dst":"B","weight":0.9},{"src":"A","dst":"C","weight":0.4},{"src":"B","dst":"C","weight":0.7},{"src":"C","dst":"D","weight":0.6}]}' backbone
	@echo ""
	@echo "--- F5: Viral Spread ---"
	./$(TARGET) '{"nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"}],"edges":[{"src":"A","dst":"B","weight":0.9},{"src":"A","dst":"C","weight":0.8},{"src":"B","dst":"D","weight":0.7}],"args":{"seedId":"A","maxRounds":5}}' simulate-spread
	@echo ""
	@echo "All tests passed."
