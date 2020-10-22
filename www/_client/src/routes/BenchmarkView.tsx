import { Box, FormControl, InputLabel, MenuItem, Select, TextField, Tooltip, Button, Paper, Card, CardContent, CardHeader } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { PlotData, PlotMouseEvent } from "plotly.js";
import React, { useEffect, useState } from "react";
import Moment from "react-moment";
import Plot from "react-plotly.js";
import { useParams } from 'react-router-dom';
import { SimpleLoader } from "../components/SimpleLoader";
import { configurations, getConfiguration, handleDispatch, httpClient } from "../init";
import { IBaseline, IColRepoInfo, IConfigurationDto, IIndexInfo, ISimpleTimers, ISimpleTimersEx } from "../models/DataModel";
import "../styles/chart.css";
import { trimSha } from './BenchmarkView.Model';





export interface BenchmarkViewProps {
    simple?: boolean;
    hideTitle?: boolean;
    hideXTicks?: boolean;
    configuration?: IIndexInfo;
    size?: "big" | "small";
    hideBroken?: boolean
}

export function useResource<T>(url?: string) {
    const [resource, serResource] = useState<T>();
    useEffect(() => {
        if (url) {
            serResource(undefined);
            httpClient.fetch<T>(url, undefined, "auto")
                .then(serResource)
                .catch(e => serResource(undefined));
        }
    }, [url]);

    return resource;
}

export function usePostResource<T>(url?: string, data?: any) {
    const [resource, serResource] = useState<T>();
    useEffect(() => {
        if (url && data) {
            serResource(undefined);
            httpClient.fetch<T>(url, data, "auto")
                .then(serResource)
                .catch(e => serResource(undefined));
        }
    }, [URL, JSON.stringify(data)]);

    return resource;
}

const transformData = (info?: TimerWrapper) => {
    return !info ? [] : info.data.map(
        i => {
            const dur = i.durations || [0, 0, 0];
            const len = dur.length;
            const int = Math.floor;
            return {
                ...i,
                low: Math.min(...dur),
                high: Math.max(...dur),
                median: dur[int(len / 2)],
                q1: dur[int(len * 0.25)],
                q3: dur[int(len * 0.75)],
            }
        }
    ) as ISimpleTimersEx[];
}

const getCommitMap = (timers: ISimpleTimersEx[]) => {
    return new Map(timers.map(c => [c.commit, c.info]));
}

interface TimerWrapper {
    data: ISimpleTimers[];
    ration: number
}


const useFilter = (info: IIndexInfo, branch: string) => {
    let filterValue = { info: info, limit: 5000 };
    filterValue.info.branch = branch;

    const [filter, setFilter] = useState(filterValue);
    const json = JSON.stringify(filterValue);

    useEffect(() => {
        setFilter(filterValue);
        console.log("new filter");
    }, [json]);

    return filter;
}

const getConfigLabel = (config: IIndexInfo) => {
    return `${config.test} ${config.benchmark} ${config.mesh}`;
}

let renderStatsSetTimer: any = (timer: ISimpleTimersEx) => null;

export const BenchmarkView = (props: BenchmarkViewProps) => {
    const { configuration } = props;

    // server config
    const [serverConfig, setServerConfig] = useState(getConfiguration());

    // toolbar options
    const [selectedCommit, setSelectedCommit] = useState<ISimpleTimers>();
    const [selectedBaseline, setSelectedBaseline] = useState<IBaseline>();
    const [selectedBranch, setSelectedBranch] = useState("JHy_runtest");

    const selectedBaselineIndex = selectedBaseline?.commit ?? "";
    const selectedInfo = serverConfig?.branches.find(i => i.commit == selectedCommit?.commit);

    // configuration filter
    const configIndex = Number((useParams() as any).index);
    const [selectedConfiguration, setSelectedConfiguration] = useState(configuration ?? configurations[configIndex]);
    const selectedConfigurationIndex = configurations.indexOf(selectedConfiguration);
    const filter = useFilter(selectedConfiguration, selectedBranch);

    // load data
    const info = usePostResource<TimerWrapper>("timers/list", filter);

    // chart data
    const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
    const [data, setData] = useState<ISimpleTimersEx[]>([]);
    const [plotData, setPlotData] = useState<PlotData[]>([]);
    // const [renderStatsSetTimer, setRenderStatsSetTimer] = useState<any>();

    const getColor = (timer: ISimpleTimersEx) => {
        const isSelected = selectedCommits.indexOf(timer.commit) != -1;

        if (isSelected) {
            return "rgba(214, 164, 93, 0.5)"
        }

        if (timer.welch?.significant) {
            return timer.welch.estimatedValue1 > timer.welch.estimatedValue2
                ? "rgba(255, 130, 90, 0.5)"
                : "rgba(130, 255, 90, 0.5)";
        }

        return "rgba(93, 164, 214, 0.5)";
    }

    // listen for load
    handleDispatch<IConfigurationDto>("configurationLoaded", (data) => {
        setServerConfig(data);
    });

    useEffect(() => {
        setData(transformData(info));
    }, [info]);

    useEffect(() => {
        setPlotData(data.map(i => {
            return {
                type: "box",
                customdata: i as any,
                y: i.durations,
                name: i.commit.substr(0, 8),
                marker: {
                    color: getColor(i),
                },

            } as PlotData;
        }));
    }, [data, selectedCommits]);

    // wait until everything loaded
    if (!serverConfig || !info || !info.data.length || !data || !plotData) {
        return <SimpleLoader />
    }

    const handleBaselineChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const commit = event.target.value as string;
        setSelectedBaseline(serverConfig.frontendConfig.baselines.find(i => i.commit == commit));
    };

    const handleBranchChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedBranch(event.target.value as string);
    };

    const handleCommitChange = (event, newVal) => {
        setSelectedCommit(data.find(i => i.commit == newVal?.commit));
    }

    const handleConfigurationChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedConfiguration(configurations[Number(event.target.value)]);
    }


    const handleClick = (event: Readonly<PlotMouseEvent>) => {
        const info = (event.points[0].data.customdata as unknown as ISimpleTimersEx);
        const commit = info.commit;
        renderStatsSetTimer(info);
        setSelectedCommit(data?.find(i => i.commit == commit));

        if (selectedCommits.indexOf(commit) == -1) {
            setSelectedCommits([...selectedCommits, commit]);
        } else {
            setSelectedCommits([...selectedCommits.filter(i => i != commit)]);
        }
    }

    const handleHover = (event: Readonly<PlotMouseEvent>) => {
        const info = (event.points[0].data.customdata as unknown as ISimpleTimersEx);
    }

    const renderBranches = (branches: string[]) => {
        if (branches.length <= 3) {
            return <>{branches.join(", ")}</>
        }
        const sub = [...branches.slice(0, 3), "..."];
        return <Tooltip title={branches.join(", ")}>
            <>{sub.join(", ")}</>
        </Tooltip>
    }

    return <>
        <Box display="flex">
            <FormControl>
                <InputLabel id="config-label">Configuration</InputLabel>
                <Select labelId="config-label" value={selectedConfigurationIndex} onChange={handleConfigurationChange} style={{ minWidth: 400 }}>
                    {configurations.map((i, j) =>
                        <MenuItem key={j} value={j}>{getConfigLabel(i)}</MenuItem>
                    )}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id="branch-label">Branch</InputLabel>
                <Select labelId="branch-label" value={selectedBranch} onChange={handleBranchChange} style={{ minWidth: 200 }}>
                    {serverConfig.branchNames.map((i, j) =>
                        <MenuItem key={j} value={i}>{i}</MenuItem>
                    )}
                </Select>
            </FormControl>
            <FormControl>
                <InputLabel id="baseline-label">Baseline</InputLabel>
                <Select labelId="baseline-label" value={selectedBaselineIndex} onChange={handleBaselineChange} style={{ minWidth: 200 }}>
                    {serverConfig.frontendConfig.baselines.reverse().map((i, j) =>
                        <MenuItem key={j} value={i.commit}>{i.title} ({i.commit.substr(0, 8)})</MenuItem>
                    )}
                </Select>
            </FormControl>
            <Autocomplete autoHighlight style={{ width: 500 }}
                value={selectedInfo ?? null}
                onChange={handleCommitChange}
                options={serverConfig.branches}
                getOptionLabel={(option: IColRepoInfo) => `${option.commit?.substr(0, 6)} - ${option.author}`}
                renderOption={(option: IColRepoInfo) => (
                    <Box key={option.commit} display="flex" flexDirection="column">
                        <span>{option.author} - {renderBranches(option.branches)}</span>
                        <small><Moment date={option.authoredDatetime} fromNow /> ({option.message})</small>
                    </Box>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Choose a coommit"
                        inputProps={{
                            ...params.inputProps,
                        }}
                    />
                )}
            />
        </Box>
        <Box display="flex">
            <div style={{ width: "calc(100% - 450px)" }}>
                <Plot style={{ width: "100%", minHeight: 600 }}
                    layout={{ autosize: true, showlegend: false }}
                    config={{ responsive: true }}
                    data={plotData}
                    onClick={handleClick}
                    onHover={handleHover}
                />

                {/* <BenchmarkViewChart
                    data={data}
                    editOptions={editOptions}
                    commitFilter={[]}
                    hideTitle={true}
                    isSmall={false}
                    showBroken={true}
                    detailCommit={undefined}
                    selectedBranch={"master"}
                    onClick={selectTimer}
                    onHover={timer => setTimer(timer as any)}
                /> */}
            </div>
            <div style={{ width: 450 }}>
                <RenderStats timers={data} onInit={(i) => renderStatsSetTimer = i} />
            </div>
        </Box>
    </>
}

interface RenderStatsProps {
    timers: ISimpleTimersEx[];
    onInit(setTimer: (timer: ISimpleTimersEx) => void): void;
}

const RenderStats = (props: RenderStatsProps) => {
    const { timers, onInit } = props;
    const [timer, setTimer] = useState<ISimpleTimersEx>();

    useEffect(() => {
        onInit((nt) => setTimer(nt));
    }, []);
    if (!timer) {
        return <></>
    }

    const leftCommits = timer.left || [];
    const rightCommits = timer.right || [];

    const leftData = timers
        .filter(i => leftCommits.indexOf(i.commit) !== -1)
        .map(i => {
            return {
                y: (i.durations || []),
                x: (i.durations || []).map(j => i.commit.substr(0, 8))
            }
        });

    const rightData = timers
        .filter(i => rightCommits.indexOf(i.commit) !== -1)
        .map(i => {
            return {
                y: (i.durations || []),
                x: (i.durations || []).map(j => i.commit.substr(0, 8))
            }
        });

    const leftY = leftData.flatMap(i => i.y);
    const leftX = leftData.flatMap(i => i.x);

    const rightY = rightData.flatMap(i => i.y);
    const rightX = rightData.flatMap(i => i.x);


    return <div>
        <Card className="mx-3 mb-3">
            <CardContent>
                <CardHeader title="Data" />

                <Plot style={{ width: "100%", height: 280 }} layout={{ margin: {l: 40, r: 20, t: 0},  showlegend: false, autosize: true }} data={[
                    {
                        type: "box" as any,
                        mode: 'markers',
                        jitter: 1,
                        y: leftY,
                        x: leftX,
                        name: "left",
                    },
                    {
                        type: "box" as any,
                        mode: 'markers',
                        jitter: 1,
                        y: rightY,
                        x: rightX,
                        name: "right",
                    }
                ]} />
            </CardContent>
        </Card>

        <Card className="mx-3 mb-3">
            <CardContent>
                <CardHeader title="Repo info" />

                <DD value={<Button variant="text" href={`https://github.com/flow123d/flow123d/commit/${timer.commit}`}>{timer.commit.substr(0, 8)}</Button>} title="Branch"></DD>
                <DD title="Date" small value={<>
                    <Moment format="YYYY-MM-DD HH:mm" date={timer.info?.date} /> (<Moment fromNow date={timer.info?.date} />)
                        </>} />
                <DD value={timer.info?.branches} title="Branches" small></DD>
                <DD value={<p>{timer.info?.message}</p>} title="Message" small />
            </CardContent>
        </Card>

        <Card className="mx-3 mb-3">
            <CardContent>
                <CardHeader title="Welch test" />

                <DD value={timer.welch?.n1} title="N" />
                <DD value={timer.welch?.pValue.toExponential(2)} title="pValue" />
                <DD value={timer.welch?.statistic.toFixed(7)} title="statistics" />
                <DD value={timer.welch?.estimatedValue1.toFixed(4)} title="x1" />
                <DD value={timer.welch?.estimatedValue2.toFixed(4)} title="x2" />
                <DD value={timer.welch?.criticalValue.toFixed(4)} title="crit" />
                <DD value={timer.welch?.degreesOfFreedom.toFixed(2)} title="DoF" />
                <DD value={timer.welch?.radius} title="radius" />
                <DD value={timer.left?.reduce(trimSha)} title="Left" />
                <DD value={timer.right?.reduce(trimSha)} title="Right" />
            </CardContent>
        </Card>

        <Card className="mx-3 mb-3">
            <CardContent>
                <CardHeader title="Commit Details" />

                <DD value={timer.count} title="N" />
                <DD value={timer.low?.toFixed(4)} title="Low" />
                <DD value={timer.q1?.toFixed(4)} title="Q1" />
                <DD value={timer.median?.toFixed(4)} title="Median" />
                <DD value={timer.q3?.toFixed(4)} title="Q3" />
                <DD value={timer.high?.toFixed(4)} title="High" />
            </CardContent>
        </Card>
    </div>
}

interface DDProps {
    value: any,
    title: string,
    small?: boolean;
    tiny?: boolean;
}

export const DD = (props: DDProps) => {
    const { value, title, small, tiny } = props;
    const cls = tiny === true
        ? "tiny"
        : small === true
            ? "small"
            : "";

    return <>
        <Box style={{ justifyContent: "space-between" }} className="mx-1">
            <strong>{title}: </strong>
            <code className={cls}>{Array.isArray(value) ? value.join(", ") : value}</code>
        </Box>
    </>
}

// (window as any).Color = Color;
// (window as any).Highcharts = Highcharts;



// interface BenchmarkViewState {
//     model: BenchmarkViewModel;
//     foo: number;
// }


// export interface BenchmarkViewProps {
//     simple?: boolean;
//     hideTitle?: boolean;
//     hideXTicks?: boolean;
//     configuration?: IIndexInfo;
//     size?: "big" | "small";

//     hideBroken?: boolean
// }

// @observer
// export class BenchmarkView2 extends React.Component<BenchmarkViewProps, BenchmarkViewState, {}> {

//     @observable
//     public model = new BenchmarkViewModel()

//     @observable
//     private showBroken = false;

//     @observable
//     private showTooltip = false;

//     @observable
//     private commitFilter: string[] = [];

//     private oldCommitSha: string = "";

//     @observable
//     private timerLocked: boolean = false;

//     @observable
//     private selectedBranch: string = "master";

//     private setTimer: any;

//     @observable
//     private commitQueue: string[] = [];

//     @observable
//     private stackChart: any = null;

//     private configurationIndex?: number;
//     private branchIndex: number = 0;

//     setCommits?(commits: string[]): void;

//     @observable
//     private isLoading = false;

//     constructor(state) {
//         super(state);

//         const match = (this.props as any).match;
//         const index = match ? match.params.index : null;
//         this.configurationIndex = index ? Number(index) : undefined;

//         if (this.props.configuration != null) {
//             this.model.configuration = this.props.configuration
//         } else if (index != null) {
//             this.model.configuration = configurations[index] as IIndexInfo;
//         }
//         this.model.configuration.branch = this.model.configuration.branch || "master";
//         window.addEventListener("keydown", e => this.handleKeyDown(e));
//     }

//     @action.bound
//     load() {
//         if (this.isLoading) {
//             return;
//         }
//         this.isLoading = true;
//         httpClient.fetch<ISimpleTimers[]>("timers/list", this.model.filter)
//             .then((json: any) => {

//                 let rawData = json.data as ISimpleTimers[];

//                 if (this.props.hideBroken === true) {
//                     rawData = rawData
//                         .filter(i => i.isBroken === false);
//                 }

//                 const data: ISimpleTimersEx[] = rawData.map(
//                     i => {
//                         const dur = i.durations || [0, 0, 0];
//                         const len = dur.length;
//                         const int = Math.floor;

//                         return {
//                             ...i,
//                             low: Math.min(...dur),
//                             high: Math.max(...dur),
//                             median: dur[int(len / 2)],
//                             q1: dur[int(len * 0.25)],
//                             q3: dur[int(len * 0.75)],
//                         }
//                     }
//                 )

//                 this.model.items = data;
//                 this.model.ratio = json.ratio;

//                 this.isLoading = false;
//                 NotificationApi.success('Data loaded', "", 1000);
//             });
//     }

//     componentDidMount() {
//         this.load();
//     }

//     switchConfig(item: IIndexInfo) {
//         const branch = this.model.configuration.branch;
//         this.model.configuration = item;
//         this.model.configuration.branch = branch;
//         this.load();
//     }

//     changeBranch(branch: string) {
//         this.selectedBranch = branch;
//         this.model.configuration.branch = branch;
//         this.load();
//     }

//     @action.bound
//     handleKeyDown(e: KeyboardEvent) {
//         if (e.key === "Shift") {
//             this.showTooltip = !this.showTooltip;
//         }
//     }

//     compareCommitsDefault() {
//         this.compareCommits(this.commitQueue[0], this.commitQueue[1], '/whole-program');
//     }

//     compareCommits(commitA: string, commitB: string, frame: string) {
//         if (!commitA || !commitB) {
//             return;
//         }

//         const filter: ICompareCommitFilter = {
//             info: this.model.configuration,
//             commitA: commitA,
//             commitB: commitB,
//             frame: frame,
//         };
//         const that = this;
//         httpClient.fetch<ICompareCommitDto>("compare-commit/compare-ab", filter)
//             .then(i => {
//                 const framesA = i.commitA.map(j => j.frame);
//                 const framesB = i.commitB.map(j => j.frame);

//                 // assuming framesA.length == framesB.length;

//                 const frameAData = framesA.map((j, k) => {
//                     return {
//                         stack: 'A',
//                         name: j,
//                         data: [
//                             i.commitA[k].duration.avg,
//                             i.commitB[k].duration.avg
//                         ],
//                     }
//                 });
//                 const d: Highcharts.Options = {
//                     title: {
//                         text: undefined,
//                     },
//                     chart: {
//                         type: "column",
//                         height: 600,
//                     },
//                     xAxis: {
//                         categories: [
//                             `${filter.commitA.substr(0, 6)} [${i.rootA.duration.avg.toFixed(3)} sec]`,
//                             `${filter.commitB.substr(0, 6)} [${i.rootB.duration.avg.toFixed(3)} sec]`,
//                         ]
//                     },
//                     plotOptions: {
//                         series: {
//                             events: {
//                                 click: function () {
//                                     that.compareCommits(
//                                         filter.commitA, filter.commitB,
//                                         `${filter.frame}/${this.name}`
//                                     );
//                                 }
//                             }
//                         },
//                         column: {
//                             stacking: 'normal',
//                         }
//                     },
//                     series: [...frameAData as any],
//                 };
//                 this.stackChart = { options: d, filter: filter };
//             });
//     }

//     @action.bound
//     rememberCommit(commit: string) {
//         if (this.commitQueue.includes(commit)) {
//             return;
//         }

//         this.commitQueue.push(commit);
//         this.commitQueue = this.commitQueue.slice(-2);
//         if (this.setCommits != null) {
//             this.setCommits(this.commitQueue);
//         }
//     }

//     render() {
//         console.log("render");;

//         const { commitFilter, model, showBroken, oldCommitSha, selectedBranch } = this;
//         const configurationName = getConfigurationName(model.configuration);
//         const { size, simple, hideTitle } = this.props;
//         const isSmall = size === "small";
//         const isSimple = simple === true;
//         const data = model.items;
//         const detailMode = commitFilter.length > 0;


//         const handleClick = (timer: ISimpleTimers) => {
//             this.rememberCommit(timer.commit);
//             if (!this.setTimer) {
//                 return;
//             }
//             this.setTimer(timer);
//             this.timerLocked = !this.timerLocked;
//         }

//         const handleHover = (timer: ISimpleTimers) => {
//             if (!this.setTimer) {
//                 return;
//             }

//             if (!this.timerLocked) {
//                 this.setTimer(timer);
//             }
//         }

//         if (model.items.length === 0) {
//             return <SimpleLoader />
//         }

//         const branches = new Map([
//             // ["", data.length],
//             ...countUnique(
//                 data.filter(i => i.isBroken === false)
//                     .flatMap(i => i.info?.branches || [])
//                     .filter(i => i != null && i != "HEAD"))
//                 .entries()
//         ]);

//         return <>
//             {true && <>
//                 {!simple &&
//                     <>
//                         <BenchmarkToolbar
//                             onInit={setCommits => this.setCommits = setCommits}
//                             onCompareCommits={(a, b) => this.compareCommits(a, b, "/whole-program/application-run")}
//                             configurations={configurations}
//                             defaultConfiguration={this.configurationIndex}
//                             onConfigurationChange={cfg => {
//                                 this.configurationIndex = configurations.indexOf(cfg);
//                                 this.switchConfig(cfg);
//                                 (this.props as any).history.push(`/benchmarks/${this.configurationIndex}`);
//                             }}

//                             branches={[...branches.entries()]
//                                 .map(i => { return { name: `${i[0]} (${i[1]} commits)`, value: i[0] } })}
//                             defaultBranch={this.branchIndex}
//                             onBranchChange={(br) => this.changeBranch(br.value)}
//                         />
//                         {this.stackChart !== null && <>
//                             <Dialog
//                                 open={this.stackChart !== null}
//                                 onClose={() => this.stackChart = null}
//                                 fullWidth={true} maxWidth={"lg"}>
//                                 <DialogTitle>
//                                     <MuiButtonGroup size="small">
//                                         {(this.stackChart.filter.frame as string)
//                                             .split("/")
//                                             .map((i, j) => <MuiButton key={j} onClick={() => this.compareCommits(
//                                                 this.stackChart.filter.commitA,
//                                                 this.stackChart.filter.commitB,
//                                                 `${this.stackChart.filter.frame.split("/").slice(0, j + 1).join('/')}`
//                                             )}>
//                                                 {i || "/"}
//                                             </MuiButton>)}
//                                     </MuiButtonGroup>
//                                 </DialogTitle>
//                                 <DialogContent dividers>
//                                     <HighchartsReact
//                                         highcharts={Highcharts}
//                                         options={this.stackChart.options} />
//                                 </DialogContent>
//                             </Dialog>
//                         </>}
//                     </>
//                 }
//                 <Row>
//                     <Col lg={isSmall ? 12 : 9}>
//                         <BenchmarkViewChart
//                             commitFilter={commitFilter}
//                             hideTitle={hideTitle === true}
//                             isSmall={isSmall}
//                             model={model}
//                             showBroken={showBroken}
//                             detailCommit={oldCommitSha}
//                             selectedBranch={selectedBranch}
//                             onClick={timer => handleClick(timer)}
//                             onHover={timer => handleHover(timer)}
//                         />
//                     </Col>
//                     {!isSmall &&
//                         <Col lg={3}>
//                             <RenderStats
//                                 onInit={setTimer => this.setTimer = setTimer}
//                                 timers={data}
//                             />
//                         </Col>}
//                 </Row>
//             </>}
//         </>
//     }
// }