// Stable_match_nTo1.cpp : 定义控制台应用程序的入口点。
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////
//				         	集装箱-路径稳定匹配的局部搜索算法											  //
//											WX SHAN														  //
//											2023-08-06													  //
////////////////////////////////////////////////////////////////////////////////////////////////////////////


#include "stdafx.h"
#include <ctime>
#include <string>

#include "Conf.h"
#include "commandline.h"
#include "InstanceLIB.h"
#include "StableMatching.h"

using namespace std;

int main(int argc, char *argv[]) {
    // 初始化随机种子
    srand((unsigned) time(NULL));

    // 使用默认路径或命令行参数（如果提供）
    string data_network_fileName = "data/network.csv";
    string data_shipment_fileName = "data/shipment.csv";
    string data_route_fileName = "data/route.csv";
    string data_cooperation_fileName = "data/cooperation_parameter.csv";
    string result_fileName = "result/stable_matching.csv";

    // 如果提供了命令行参数，则覆盖路径
    if (argc >= 2) {
        data_network_fileName = argv[1];
    }
    if (argc >= 3) {
        data_shipment_fileName = argv[2];
    }
    if (argc >= 4) {
        data_route_fileName = argv[3];
    }
    if (argc >= 5) {
        data_cooperation_fileName = argv[4];
    }
    if (argc >= 6) {
        result_fileName = argv[5];
    }

    clock_t start = clock();
    clock_t end = clock();
    try {
        // 创建命令行对象，包含算法参数和文件路径
        CommandLine commandline(data_network_fileName, data_shipment_fileName, data_route_fileName,
                                data_cooperation_fileName, result_fileName);

        // 显示算法参数
        commandline.print_algorithm_parameters();
        // 第二步：读取实例
        cout << "----- READING INSTANCE -----" << endl;
        cout << endl;
        InstanceLIB CRSM(commandline.pathInstance_network, commandline.pathInstance_shipment,
                         commandline.pathInstance_route, commandline.pathInstance_cooperation);

        // 稳定匹配
        cout << "----- STABLE MATCHING -----" << endl;
        cout << endl;

        // 运行集装箱-路径稳定匹配的局部搜索算法
        StableMatching LS(CRSM);
        LS.run();

        // 导出最佳解决方案
        if (true == LS.BestSolution.stable_orNot) {
            cout << "----- Stable Matching Found -----" << endl;
            cout << endl;
        } else {
            cout << "----- No Stable Matching Found -----" << endl;
            cout << endl;
        }
        cout << "----- WRITING BEST SOLUTION -----" << endl;
        cout << endl;
        end = clock();
        LS.exportBestSolution(commandline.pathSolution, (float) (end - start) / CLOCKS_PER_SEC);
    } catch (const string &e) { cout << "EXCEPTION | " << e << endl; }
    catch (const exception &e) { cout << "EXCEPTION | " << e.what() << endl; }

    // 显示执行时间并自动结束程序
    cout << "CPU time is: " << (float) (end - start) / CLOCKS_PER_SEC << "S" << endl;
    cout << "Program finished. Exiting automatically..." << endl;

    return 0;
}