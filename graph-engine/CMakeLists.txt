cmake_minimum_required(VERSION 3.16)
project(graph-engine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------------------------
#  Build type defaults
# ---------------------------------------------------------------
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Release flags: full optimisation + link-time optimisation
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -march=native")
set(CMAKE_CXX_FLAGS_DEBUG   "-g -fsanitize=address,undefined")

# ---------------------------------------------------------------
#  Auto-download nlohmann/json if not present
# ---------------------------------------------------------------
set(JSON_HEADER "${CMAKE_SOURCE_DIR}/include/json.hpp")

if(NOT EXISTS ${JSON_HEADER})
    message(STATUS "Downloading nlohmann/json single-header...")
    file(DOWNLOAD
        "https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp"
        ${JSON_HEADER}
        SHOW_PROGRESS
        STATUS DOWNLOAD_STATUS
    )
    list(GET DOWNLOAD_STATUS 0 DOWNLOAD_ERROR)
    if(DOWNLOAD_ERROR)
        message(WARNING "Could not download json.hpp — building without JSON support (USE_SIMPLE_JSON mode)")
        add_compile_definitions(USE_SIMPLE_JSON)
    else()
        message(STATUS "json.hpp downloaded successfully")
    endif()
else()
    message(STATUS "json.hpp found at ${JSON_HEADER}")
endif()

# ---------------------------------------------------------------
#  Source files
# ---------------------------------------------------------------
set(ENGINE_SOURCES
    src/main.cpp
    src/Dijkstra.cpp
    src/Prim.cpp
    src/PageRank.cpp
    src/Community.cpp
    src/Stability.cpp
    src/Simulation.cpp
    src/Forecaster.cpp
)

# ---------------------------------------------------------------
#  Executable target
# ---------------------------------------------------------------
add_executable(graph-engine ${ENGINE_SOURCES})

target_include_directories(graph-engine PRIVATE
    ${CMAKE_SOURCE_DIR}/include
)

# ---------------------------------------------------------------
#  Warnings
# ---------------------------------------------------------------
if(MSVC)
    target_compile_options(graph-engine PRIVATE /W4)
else()
    target_compile_options(graph-engine PRIVATE
        -Wall -Wextra -Wpedantic
        -Wno-unused-parameter   # common in algorithm stubs
    )
endif()

# ---------------------------------------------------------------
#  Install target
# ---------------------------------------------------------------
install(TARGETS graph-engine DESTINATION bin)

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Compiler:   ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
