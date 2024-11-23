// src/components/lists.tsx
import React, { useState, useEffect, useRef } from 'react';
import '../style/lists.css';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; // Import Filesystem

interface List {
    name: string;
    items: { text: string; checked: boolean }[];
}

const Lists: React.FC = () => {
    const [lists, setLists] = useState<List[]>([]);
    const [newListName, setNewListName] = useState('');
    const [selectedListIndex, setSelectedListIndex] = useState<number | null>(null);
    const [showNewListInput, setShowNewListInput] = useState(false);

    const newListInputRef = useRef<HTMLInputElement>(null);

    // Save list to a JSON file
    const saveListToFile = async (listName: string, items: { text: string; checked: boolean }[]) => {
        try {
            await Filesystem.writeFile({
                path: `${listName}.json`,
                data: JSON.stringify(items),
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
            });
            console.log(`List ${listName} saved successfully.`);
        } catch (error) {
            console.error(`Error saving list ${listName}:`, error);
        }
    };

    // Load list from JSON file
    const loadListFromFile = async (listName: string) => {
        try {
            const result = await Filesystem.readFile({
                path: `${listName}.json`,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
            });
            return JSON.parse(result.data);
        } catch (error) {
            console.error(`Error loading list ${listName}:`, error);
            return [];
        }
    };

    useEffect(() => {
        if (showNewListInput && newListInputRef.current) {
            newListInputRef.current.focus();
        }
    }, [showNewListInput]);

    // Load existing lists from files on component mount
    useEffect(() => {
        const loadLists = async () => {
            const loadedLists: List[] = [];
            for (const list of lists) {
                const items = await loadListFromFile(list.name);
                loadedLists.push({ ...list, items });
            }
            setLists(loadedLists);
        };
        loadLists();
    }, []);

    const addList = () => {
        if (newListName.trim()) {
            const newList = { name: newListName, items: [] };
            setLists([...lists, newList]);
            setSelectedListIndex(lists.length);
            saveListToFile(newList.name, newList.items); // Save new list to file
            setNewListName('');
            setShowNewListInput(false);
        }
    };

    const selectList = (index: number) => {
        setSelectedListIndex(index);
    };

    const deleteList = async (index: number) => {
        const listName = lists[index].name;
        const updatedLists = lists.filter((_, i) => i !== index);
        setLists(updatedLists);

        try {
            await Filesystem.deleteFile({
                path: `${listName}.json`,
                directory: Directory.Documents,
            });
            console.log(`List ${listName} deleted successfully.`);
        } catch (error) {
            console.error(`Error deleting list ${listName}:`, error);
        }

        if (selectedListIndex === index) {
            setSelectedListIndex(null);
        } else if (selectedListIndex !== null && selectedListIndex > index) {
            setSelectedListIndex(selectedListIndex - 1);
        }
    };

    const addItemToList = (listIndex: number, newItemText: string) => {
        const updatedLists = lists.map((list, i) => {
            if (i === listIndex) {
                const updatedItems = [...list.items, { text: newItemText, checked: false }];
                saveListToFile(list.name, updatedItems); // Save updated list to file
                return { ...list, items: updatedItems };
            } else {
                return list;
            }
        });
        setLists(updatedLists);
    };

    const toggleItemInList = (listIndex: number, itemIndex: number) => {
        const updatedLists = lists.map((list, i) => {
            if (i === listIndex) {
                const updatedItems = list.items.map((item, j) => {
                    if (j === itemIndex) {
                        return { ...item, checked: !item.checked };
                    } else {
                        return item;
                    }
                });
                saveListToFile(list.name, updatedItems); // Save updated list to file
                return { ...list, items: updatedItems };
            } else {
                return list;
            }
        });
        setLists(updatedLists);
    };

    return (
        <div className="lists-container">
            <button onClick={() => setShowNewListInput(true)} className="add-list-button">
                New List
            </button>
            {showNewListInput && (
                <div className="input-group">
                    <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Enter list name"
                        className="input-field"
                        ref={newListInputRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addList();
                            }
                        }}
                    />
                    <button onClick={addList} className="confirm-button">
                        Confirm
                    </button>
                    <button onClick={() => setShowNewListInput(false)} className="cancel-button">
                        Cancel
                    </button>
                </div>
            )}
            <div className="list-names">
                {lists.map((list, index) => (
                    <div key={index} className="list-item">
            <span
                onClick={() => selectList(index)}
                className={`list-name ${selectedListIndex === index ? 'selected-list' : ''}`}
            >
              {list.name}
            </span>
                        <button
                            onClick={() => deleteList(index)}
                            className="delete-list-button"
                            title="Delete List"
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
            {selectedListIndex !== null && (
                <ListDetails
                    list={lists[selectedListIndex]}
                    listIndex={selectedListIndex}
                    addItemToList={addItemToList}
                    toggleItemInList={toggleItemInList}
                />
            )}
        </div>
    );
};

interface ListDetailsProps {
    list: List;
    listIndex: number;
    addItemToList: (listIndex: number, newItemText: string) => void;
    toggleItemInList: (listIndex: number, itemIndex: number) => void;
}

const ListDetails: React.FC<ListDetailsProps> = ({
                                                     list,
                                                     listIndex,
                                                     addItemToList,
                                                     toggleItemInList,
                                                 }) => {
    const [newItem, setNewItem] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [listIndex]);

    const addItem = () => {
        if (newItem.trim()) {
            addItemToList(listIndex, newItem);
            setNewItem('');
        }
    };

    const toggleItem = (index: number) => {
        toggleItemInList(listIndex, index);
    };

    // Sort items: unchecked items first, checked items at the bottom
    const sortedItems = list.items
        .map((item, idx) => ({ ...item, originalIndex: idx }))
        .sort((a, b) => {
            if (a.checked === b.checked) return 0;
            return a.checked ? 1 : -1;
        });

    return (
        <div className="list-details">
            <h2>{list.name}</h2>
            <div className="input-group">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Enter task"
                    className="input-field"
                    ref={inputRef}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            addItem();
                        }
                    }}
                />
                <button onClick={addItem} className="add-button">
                    Add Task
                </button>
            </div>
            <ul>
                {sortedItems.map((item) => (
                    <li key={item.originalIndex}>
                        <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItem(item.originalIndex)}
                        />
                        {item.text}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Lists;
