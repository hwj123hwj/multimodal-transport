src = open("/tmp/cpp_expe/Stable_match_nTo1.cpp", encoding="utf-8").read()

old = "    if (argc >= 6) {\n        result_fileName = argv[5];\n    }\n\n    clock_t start = clock();"

new = (
    "    if (argc >= 6) {\n        result_fileName = argv[5];\n    }\n"
    "    // optional algo params: argv[6]=MaxNum_preferList argv[7]=MaxNum_iter argv[8]=MaxNum_incompleteStable argv[9]=probability_randomWalk\n"
    "    if (argc >= 7)  { Conf::MaxNum_preferList      = std::stoi(argv[6]); }\n"
    "    if (argc >= 8)  { Conf::MaxNum_iter             = std::stoi(argv[7]); }\n"
    "    if (argc >= 9)  { Conf::MaxNum_incompleteStable = std::stoi(argv[8]); }\n"
    "    if (argc >= 10) { Conf::probability_randomWalk  = std::stod(argv[9]); }\n"
    "\n    clock_t start = clock();"
)

assert old in src, "patch target not found"
result = src.replace(old, new, 1)
open("/tmp/cpp_expe/Stable_match_nTo1.cpp", "w", encoding="utf-8").write(result)
print("patched ok")
