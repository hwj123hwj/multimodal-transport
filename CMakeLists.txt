cmake_minimum_required(VERSION 3.29)
project(stable_match)

set(CMAKE_CXX_STANDARD 14)


# 添加静态链接选项，避免运行时依赖DLL文件
set(CMAKE_EXE_LINKER_FLAGS "-static")
# 添加所有源文件到可执行文件
add_executable(stable_match
        Stable_match_nTo1.cpp
        Conf.cpp
        Conf.h
        commandline.cpp
        commandline.h
        InstanceLIB.cpp
        InstanceLIB.h
        StableMatching.cpp
        StableMatching.h
        stdafx.cpp
        stdafx.h
        targetver.h
)

# 复制数据文件到构建目录
file(COPY ${CMAKE_SOURCE_DIR}/data DESTINATION ${CMAKE_BINARY_DIR})
file(COPY ${CMAKE_SOURCE_DIR}/result DESTINATION ${CMAKE_BINARY_DIR})