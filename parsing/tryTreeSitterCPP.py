import tree_sitter_cpp as tscpp
from tree_sitter import Language, Parser

# Load the Tree-sitter parser for C++
CPP_LANGUAGE = Language(tscpp.language())
parser = Parser(CPP_LANGUAGE)

# Function to parse and evaluate C++ code
def parse_and_evaluate_code(file_path):
    with open(file_path, 'r') as file:
        code = file.read()
    
    # Parse the code using Tree-sitter
    tree = parser.parse(bytes(code, 'utf8'))
    
    # You can now evaluate or process the tree here
    # For example, you can print the root node of the parse tree
    print(f"Parse tree for {file_path}:\n")
    print(tree.root_node)

# Call the function for both files
parse_and_evaluate_code("pretrained_output.txt")
parse_and_evaluate_code("finetuned_output.txt")

